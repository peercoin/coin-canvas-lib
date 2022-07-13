// Copyright 2022 Matthew Mitchell

import { PixelData } from "./PixelData";
import * as utils from "./utils";
import binaryHttpRequest from "./binaryHttpRequest";
import Canvas from "./Canvas";
import CoinCanvasHttpClient from "./CoinCanvasHttpClient";
import PixelColour from "./PixelColour";
import CoinCanvasWebSocketClient from "./CoinCanvasWebSocketClient";
import PixelAddrGenerator from "./PixelAddrGenerator";
import {NUM_COLOURS} from "./constants";
import Colour from "./Colour";

export default class CoinCanvasClient {
    #xLen: number;
    #yLen: number;
    #wsURL: string;
    #bitmapURL: string;
    #reconnectMs: number;
    #addrGen: PixelAddrGenerator;
    #onFullCanvas: (canvas: Canvas) => void;
    #onUpdatedPixels: (pixel: PixelColour[]) => void;
    #onError: (what: string) => void;
    #wsOrigin: string | undefined;
    #bitmapOrigin: string | undefined;

    #http: CoinCanvasHttpClient;
    #wsClient: CoinCanvasWebSocketClient | null = null;

    #waitingForBitmap = false;
    #pixelUpdateBuffer: PixelColour[] = [];
    #closed = false;

    /**
     * This takes care of communicating with the CoinCanvas APIs and provides
     * callbacks to manipulate a canvas with.
     * @param args.onFullCanvas Provides a {Canvas} object representing the full
     * canvas that can be painted.
     * @param args.onUpdatedPixels Provides an array of {PixelColour}s representing
     * single pixel colours that have been updated.
     * @param args.onError When an error occurs with communication to the back-end
     * server. Reconnection will be attempted after {reconnectMs} and the error
     * can be cleared upon the following call to {onFullCanvas}.
     */
    constructor(args: {
        xLen: number, yLen: number,
        wsURL: string, httpURL: string, httpRateLimit: number, bitmapURL: string,
        reconnectMs: number,
        addrGen: PixelAddrGenerator,
        wsOrigin?: string
        httpOrigin?: string
        bitmapOrigin?: string
        onFullCanvas: (canvas: Canvas) => void,
        onUpdatedPixels: (pixel: PixelColour[]) => void,
        onError: (what: string) => void,
    }) {

        this.#xLen = args.xLen;
        this.#yLen = args.yLen;
        this.#http = new CoinCanvasHttpClient(
            args.httpURL, args.httpRateLimit, args.httpOrigin
        );
        this.#wsURL = args.wsURL;
        this.#bitmapURL = args.bitmapURL;
        this.#reconnectMs = args.reconnectMs;
        this.#addrGen = args.addrGen;
        this.#onFullCanvas = args.onFullCanvas;
        this.#onUpdatedPixels = args.onUpdatedPixels;
        this.#onError = args.onError;

        this.#wsOrigin = args.wsOrigin;
        this.#bitmapOrigin = args.bitmapOrigin;

        this.#start();

    }

    async pixel(x: number, y: number): Promise<PixelData> {
        const balances = await this.#http.pixelBalances(x, y);
        return utils.range(NUM_COLOURS).map(i => ({
            balance: balances[i],
            address: this.#addrGen.forPixelColour(x, y, i),
            colour: Colour.fromId(i)
        }));
    }

    close() {
        this.#wsClient?.close();
        this.#onError = utils.nop;
        this.#onUpdatedPixels = utils.nop;
        this.#onFullCanvas = utils.nop;
        this.#closed = true;
    }

    #start() {

        if (this.#closed) return;

        this.#waitingForBitmap = true;
        this.#pixelUpdateBuffer = [];

        // Start websockets before downloading the bipmap
        this.#wsClient = new CoinCanvasWebSocketClient({
            url: this.#wsURL,
            onOpen: () => this.#wsOpened(),
            onClose: reason => this.#error(reason),
            onPixelColours: colours => this.#updatedColours(colours),
            nodeOrigin: this.#wsOrigin
        });

    }

    async #wsOpened() {

        try {

            // Download bitmap
            const size = Math.ceil(this.#xLen*this.#yLen / 2);
            const rawBitmap = await binaryHttpRequest(
                this.#bitmapURL, size, this.#bitmapOrigin
            );
            const canvas = new Canvas(this.#xLen, this.#yLen, rawBitmap);

            // Add changes received from web socket
            this.#pixelUpdateBuffer.forEach(pixel => canvas.updatePixel(pixel));

            // Provide full canvas to callback
            this.#onFullCanvas(canvas);
            this.#waitingForBitmap = false;

        } catch (error) {
            void this.#error(utils.getErrorMessage(error));
        }

    }

    async #error(reason: string) {
        if (this.#closed) return;
        // Reopen after delay
        this.#onError(reason);
        await utils.sleep(this.#reconnectMs);
        this.#start();
    }

    #updatedColours(colours: PixelColour[]) {
        // If we are waiting for the initial canvas, add to buffer, otherwise
        // provide to callback so pixel can be updated
        if (this.#waitingForBitmap)
            this.#pixelUpdateBuffer.push(...colours);
        else
            this.#onUpdatedPixels(colours);
    }

}

