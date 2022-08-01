// Copyright 2022 Matthew Mitchell

/* eslint-disable object-property-newline */

import {jest} from "@jest/globals";
import CoinCanvasWebSocketClient from "../src/CoinCanvasWebSocketClient";
import {Server, Client} from "mock-socket";
import {range, sleep} from "../src/utils";
import PixelColour from "../src/PixelColour";
import {getWsClient, waitForCall} from "./utils";

const TEST_URL = "ws://localhost:8080";

class TestConnection {
    mockServer = new Server(TEST_URL);
    api: CoinCanvasWebSocketClient;
    onOpen = jest.fn();
    onClose = jest.fn();
    onPixelColours = jest.fn();
    client: Client | null = null;

    constructor() {
        this.api = new CoinCanvasWebSocketClient({
            url: TEST_URL,
            onOpen: () => this.onOpen(),
            onClose: () => this.onClose(),
            onPixelColours: (colours: PixelColour[]) => this.onPixelColours(colours)
        });
    }

    close() {
        this.api.close();
        this.mockServer.close();
    }

    async expectConnection(): Promise<void> {

        this.client = await getWsClient(this.mockServer);

        // Either the onOpen has been called already or we are still waiting
        await waitForCall(this.onOpen);

        expect(this.onOpen.mock.calls).toEqual([[]]);

    }

    async expectPixelColours(
        varintBytes: ArrayLike<number>, pixels: PixelColour[]
    ): Promise<void> {

        const n = pixels.length;
        const startOff = 1 + varintBytes.length;

        const buf = new ArrayBuffer(n*5+startOff);
        const ba = new Uint8Array(buf);
        const dv = new DataView(buf);

        dv.setInt8(0, 0);
        ba.set(varintBytes, 1);

        for (let i = 0; i < n; i++) {
            const off = startOff+i*5;
            dv.setInt16(off, pixels[i].coord.x);
            dv.setInt16(off+2, pixels[i].coord.y);
            dv.setInt8(off+4, pixels[i].colourId);
        }

        const promise = new Promise((resolve) => {
            this.onPixelColours.mockImplementation((respPixels) => {
                resolve(respPixels as PixelColour[]);
            });
        });

        this.client?.send(buf);

        // Expect pixel colours back
        expect(await promise).toEqual(pixels);

    }

    async expectClose(data: ArrayLike<number> | string, closes=true): Promise<void> {

        const closePromise = new Promise((resolve) => {
            this.onClose.mockImplementation(() => resolve(true));
        });

        const waitPromise = (async () => {
            await sleep(100);
            return false;
        })();

        if (typeof data === "string")
            this.client?.send(data);
        else {
            const bytes = new Uint8Array(data.length);
            bytes.set(data, 0);
            this.client?.send(bytes.buffer);
        }

        await expect(
            Promise.race([closePromise, waitPromise])
        ).resolves.toBe(closes);
        // Prevents jest complaining
        await waitPromise;

    }

}

let conn: TestConnection;
beforeEach(async () => {
    conn = new TestConnection();
    await conn.expectConnection();
});
afterEach(() => {
    conn.close();
});

test("provides pixel colours", async () => {

    await conn.expectPixelColours(
        [3],
        [
            new PixelColour({ x: 0, y: 0 }, 0),
            new PixelColour({ x: 0xffff, y: 0xffff }, 15),
            new PixelColour({ x: 1, y: 2 }, 3)
        ]
    );

    // Can recieve 256 colours
    const colours = range(256).map(
        i => new PixelColour({ x: i, y: i }, i % 16)
    );
    await conn.expectPixelColours([253, 0x01, 0], colours);

    // Understands bigint varint
    await conn.expectPixelColours([255, 0, 0, 0, 0, 0, 0, 0x01, 0], colours);

});

test("refuses non-binary data", async () => {
    await conn.expectClose("\x00\x01\x00\x00\x00\x00\x00");
});

test("ignore unknown message id", async () => {
    await conn.expectClose([1], false);
});

test("closes on 0 colours", async () => {
    await conn.expectClose([0, 0]);
});

test("closes on too short data", async () => {
    await conn.expectClose([0, 1, 0, 0, 1, 1]);
});

