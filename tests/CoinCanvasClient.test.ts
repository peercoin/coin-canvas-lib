// Copyright 2022 Matthew Mitchell

/* eslint-disable object-property-newline */
/* eslint-disable max-lines */

import axios from "axios";
import Canvas from "../src/Canvas";
import CoinCanvasClient from "../src/CoinCanvasClient";
import P2putPixelAddrGenerator from "../src/P2putPixelAddrGenerator";
import PixelColour from "../src/PixelColour";
import * as utils from "./utils";
import {Server} from "mock-socket";
import {range, sleep} from "../src/utils";
import Colour from "../src/Colour";
import {NUM_COLOURS} from "../src/constants";
import ImageData from "@canvas/image-data";
import {PixelData} from "../src/PixelData";

jest.mock("axios");

const TEST_WS_URL = "wss://testWs";
const TEST_BITMAP_URL = "https://testBitmap";
const TEST_HTTP_API_URL = "https://testHttp";
const SIDE_LEN = 10;
const PIXEL_LEN = SIDE_LEN*SIDE_LEN;
const BITMAP_ERR_MSG = "Failed bitmap";
const RECONNECT_MS = 200;

const PIXEL_0_ADDRS = [
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqqq8e09fm",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqqsjc8aug",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqpqgyqlza",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqpsa9g8hw",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqzqe23clh",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqzsvteq2y",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqrqkh7z53",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqrsrkk6pz",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqyqjk6kvr",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqys8hjwes",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqq9qat4v89",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqq9sg2a5jk",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqxqv9yt60",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqqxseyvn0u",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqq8qrct33f",
    "tpc1qcanvas0000000000000000000000000000000000000qqqqqqq8skerfy6"
];

const TEST_BALANCES = utils.getMockBalances();

function setupHttpMock(failBitmap: boolean, wait: boolean) {

    // HTTP mocking canvas bitmap and pixel response
    (axios.get as jest.Mock).mockImplementation(async (url) => {

        if (url.startsWith(TEST_HTTP_API_URL))
            return { data: utils.balancesToBuffer(TEST_BALANCES) };

        if (failBitmap)
            throw new Error(BITMAP_ERR_MSG);

        // Return bitmap

        if (wait)
            // Initally wait to ensure that ws updates are received before bitmap
            await sleep(200);

        const bitmap = new ArrayBuffer(PIXEL_LEN/2);
        const bytes = new Uint8Array(bitmap);

        // Create colours cycling through 0-15
        for (let i = 0; i < PIXEL_LEN; i++) {
            const c = i % 16;
            bytes[Math.floor(i/2)] |= c << (((i+1) % 2)*4);
        }

        return { data: bitmap };

    });
}

function getTestObject(
    onFullCanvas: (canvas: Canvas) => void,
    onUpdatedPixels: (pixel: PixelColour[]) => void,
    onError: (what: string) => void
): CoinCanvasClient {
    return new CoinCanvasClient({

        xLen: SIDE_LEN,
        yLen: SIDE_LEN,
        wsURL: TEST_WS_URL,
        httpURL: TEST_HTTP_API_URL,
        httpTimeout: 100,
        httpRateLimit: 300,
        bitmapURL: TEST_BITMAP_URL,
        bitmapTimeout: 100,
        reconnectMs: RECONNECT_MS,

        addrGen: new P2putPixelAddrGenerator(
            "tpc", [0xc7, 0x66, 0xce, 0xc1, 0xef]
        ),

        onFullCanvas,
        onUpdatedPixels,
        onError

    });

}

function getPixelUpdateBytes(firstCid = 15, secondCid = 6): ArrayBuffer {

    const buf = new ArrayBuffer(2*5+2);
    const dv = new DataView(buf);

    // Message ID and varint
    dv.setUint8(0, 0);
    dv.setUint8(1, 2);

    // Pixel 0,0
    dv.setUint16(2, 0);
    dv.setUint16(4, 0);
    dv.setUint8(6, firstCid);

    // Pixel 5,5
    dv.setUint16(7, 5);
    dv.setUint16(9, 5);
    dv.setUint8(11, secondCid);

    return buf;

}

function expectImgData(imgData: ImageData) {

    expect(imgData.height).toEqual(SIDE_LEN);
    expect(imgData.width).toEqual(SIDE_LEN);

    const expectedPixelData = new Uint8ClampedArray(4*PIXEL_LEN);
    for (let i = 0; i < PIXEL_LEN; i++) {

        let cid = i % 16;
        if (i == 0) cid = 15;
        if (i == 5*SIDE_LEN+5) cid = 6;
        const colour = Colour.fromId(cid);

        expectedPixelData[i*4] = colour.red;
        expectedPixelData[i*4+1] = colour.green;
        expectedPixelData[i*4+2] = colour.blue;
        expectedPixelData[i*4+3] = 0xff;

    }

    return expectedPixelData;

}

function expectPixelBalances(pixBals: PixelData) {

    const pixelExp = range(NUM_COLOURS).map(i => ({
        balance: TEST_BALANCES[i],
        address: PIXEL_0_ADDRS[i],
        colour: Colour.fromId(i)
    }));

    expect(pixBals).toEqual(pixelExp);

}

function expectReconnectTime(start: number) {
    const reconnectTime = Date.now() - start;
    expect(reconnectTime).toBeGreaterThanOrEqual(RECONNECT_MS);
    expect(reconnectTime).toBeLessThan(RECONNECT_MS + 100);
}

test("provides canvas, canvas updates and pixel data", async () => {

    setupHttpMock(false, true);
    const mockWs = new Server(TEST_WS_URL);

    const onCanvas = jest.fn();
    const onUpdatedPixels = jest.fn();
    const onError = jest.fn();

    const waitForCanvas = utils.mockCallbackToPromise(onCanvas);
    const client = getTestObject(onCanvas, onUpdatedPixels, onError);
    const wsClient = await utils.getWsClient(mockWs);

    // WS gives update to pixel 0,0 (c=15) and 5,5 (c=6) before canvas is
    // delivered
    wsClient?.send(getPixelUpdateBytes());

    // Expect to get canvas
    const canvas = await waitForCanvas as Canvas;
    expectImgData(canvas.getImageData());

    // Updated pixel shouldn't have been provided in callback
    expect(onUpdatedPixels.mock.calls.length).toEqual(0);

    // No errors
    expect(onError.mock.calls.length).toEqual(0);

    expectPixelBalances(await client.pixel({ x: 0, y: 0}));

    // Now receive updated pixels to onUpdatedPixels
    const promise = utils.mockCallbackToPromise(onUpdatedPixels);

    wsClient?.send(getPixelUpdateBytes(2, 10));

    expect(await promise).toEqual([
        new PixelColour({ x: 0, y: 0 }, 2),
        new PixelColour({ x: 5, y: 5 }, 10)
    ]);

    client.close();
    mockWs.close();

});

test("calls error callback and reconnects on failed bitmap", async () => {

    // Fail bitmap once and then reconnect
    setupHttpMock(true, false);
    const mockWs = new Server(TEST_WS_URL);

    const onCanvas = jest.fn();
    const onUpdatedPixels = jest.fn();
    const onError = jest.fn();

    const waitForError = utils.mockCallbackToPromise(onError);

    const startTime = Date.now();
    const client = getTestObject(onCanvas, onUpdatedPixels, onError);

    // onError is called
    expect(await waitForError).toEqual(BITMAP_ERR_MSG);

    // Change mock to not fail
    setupHttpMock(false, false);

    // Only failed once
    expect(onError.mock.calls.length).toEqual(1);

    // No calls to other callbacks
    expect(onUpdatedPixels.mock.calls.length).toEqual(0);
    expect(onCanvas.mock.calls.length).toEqual(0);

    // Expect reconnect and call to onCanvas after 200ms
    const waitForCanvas = utils.mockCallbackToPromise(onCanvas);
    const canvas = await waitForCanvas as Canvas;
    expectImgData(canvas.getImageData());

    expectReconnectTime(startTime);

    // No more errors
    expect(onError.mock.calls.length).toEqual(1);

    client.close();
    mockWs.close();

});

test("calls error callback and reconnects on WS failure", async () => {

    setupHttpMock(false, false);

    const onCanvas = jest.fn();
    const onUpdatedPixels = jest.fn();
    const onError = jest.fn();

    const startTime = Date.now();
    const waitForError = utils.mockCallbackToPromise(onError);
    const client = getTestObject(onCanvas, onUpdatedPixels, onError);
    expect(await waitForError).toEqual("");

    async function expectCanvasReconnect(start: number) {
        const canvas = await utils.mockCallbackToPromise(onCanvas) as Canvas;
        expectImgData(canvas.getImageData());
        expectReconnectTime(start);
    }

    // Should reconnect with working WS server
    let mockWs = new Server(TEST_WS_URL);
    await expectCanvasReconnect(startTime);

    // Break WS
    const waitForSecondError = utils.mockCallbackToPromise(onError);
    const breakTime = Date.now();
    mockWs.close();

    // Expect error
    expect(await waitForSecondError).toEqual("");
    expect(onError.mock.calls.length).toEqual(2);

    // Expect reconnect
    mockWs = new Server(TEST_WS_URL);
    await expectCanvasReconnect(breakTime);

    // Check calls as expected
    expect(onError.mock.calls.length).toEqual(2);
    expect(onCanvas.mock.calls.length).toEqual(2);
    expect(onUpdatedPixels.mock.calls.length).toEqual(0);

    client.close();
    mockWs.close();

});

