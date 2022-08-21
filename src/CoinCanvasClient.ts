// Copyright 2022 Matthew Mitchell

import PixelData from "./PixelData";
import * as utils from "./utils";
import binaryHttpRequest from "./binaryHttpRequest";
import Canvas from "./Canvas";
import CoinCanvasHttpClient from "./CoinCanvasHttpClient";
import PixelColour from "./PixelColour";
import CoinCanvasWebSocketClient from "./CoinCanvasWebSocketClient";
import PixelAddrGenerator from "./PixelAddrGenerator";
import PixelCoord from "./PixelCoord";

export default class CoinCanvasClient {
    #xLen: number;
    #yLen: number;
    #wsURL: string;
    #bitmapURL: string;
    #reconnectMs: number;
    #bitmapTimeout: number;
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
    #started = false;

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

        wsURL: string,
        httpURL: string,
        bitmapURL: string,

        wsOrigin?: string
        httpOrigin?: string
        bitmapOrigin?: string

        httpRateLimit: number,
        bitmapTimeout: number,
        httpTimeout: number,
        reconnectMs: number,

        addrGen: PixelAddrGenerator,

        onFullCanvas: (canvas: Canvas) => void,
        onUpdatedPixels: (pixel: PixelColour[]) => void,
        onError: (what: string) => void,

    }) {

        this.#xLen = args.xLen;
        this.#yLen = args.yLen;
        this.#http = new CoinCanvasHttpClient({
            url: args.httpURL,
            rateLimitMs: args.httpRateLimit,
            timeout: args.httpTimeout,
            nodeOrigin: args.httpOrigin
        });
        this.#wsURL = args.wsURL;
        this.#bitmapURL = args.bitmapURL;
        this.#reconnectMs = args.reconnectMs;
        this.#bitmapTimeout = args.bitmapTimeout;
        this.#addrGen = args.addrGen;
        this.#onFullCanvas = args.onFullCanvas;
        this.#onUpdatedPixels = args.onUpdatedPixels;
        this.#onError = args.onError;

        this.#wsOrigin = args.wsOrigin;
        this.#bitmapOrigin = args.bitmapOrigin;

        this.#start();

    }

    async pixel(coord: PixelCoord): Promise<PixelData> {
        const balances = await this.#http.pixelBalances(coord);
        return new PixelData(coord, balances, this.#addrGen);
    }

    close() {
        this.#wsClient?.close();
        this.#onError = utils.nop;
        this.#onUpdatedPixels = utils.nop;
        this.#onFullCanvas = utils.nop;
        this.#closed = true;
    }

    #start() {

        if (this.#closed || this.#started) return;

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

        this.#started = true;

    }

    async #wsOpened() {

        try {

            // Download bitmap
            const size = Math.ceil(this.#xLen*this.#yLen / 2);
            const rawBitmap = await binaryHttpRequest({
                url: this.#bitmapURL,
                length: size,
                headers: {
                    "Cache-Control": "no-cache", // Request from server only if changed
                    ...(this.#bitmapOrigin && { "Origin": this.#bitmapOrigin })
                },
                timeout: this.#bitmapTimeout
            });
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

        // Ensure WS is closed
        this.#wsClient?.close();
        this.#wsClient = null;

        this.#onError(reason);

        // Allow restart, but if this is set to true again whilst waiting, it
        // wont start.
        this.#started = false;

        // Reopen after delay
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

