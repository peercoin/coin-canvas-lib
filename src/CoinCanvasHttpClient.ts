// Copyright 2022 Matthew Mitchell

import binaryHttpRequest from "./binaryHttpRequest";
import { NUM_COLOURS } from "./constants";
import Deserialiser from "./Deserialiser";
import PixelCoord from "./PixelCoord";
import { range, sleep } from "./utils";

export default class CoinCanvasHttpClient {
    #url: string;
    #rateLimitMs: number;
    #lastRequestMs: number;
    #nodeOrigin?: string;

    constructor(url: string, rateLimitMs: number, nodeOrigin?: string) {
        // Ensure there is a trailing slash on the url
        this.#url = url.endsWith("/") ? url : `${url}/`;
        this.#rateLimitMs = rateLimitMs;
        this.#lastRequestMs = 0;
        this.#nodeOrigin = nodeOrigin;
    }

    async #rateLimitedRequest(path: string, length: number): Promise<ArrayBuffer> {
        const nextReqMs = this.#lastRequestMs + this.#rateLimitMs;
        const waitMs = nextReqMs - Date.now();
        if (waitMs > 0) await sleep(waitMs);
        const result = await binaryHttpRequest(
            this.#url + path, length,
            this.#nodeOrigin === undefined ? {} : { "Origin": this.#nodeOrigin }
        );
        this.#lastRequestMs = Date.now();
        return result;
    }

    async pixelBalances(coord: PixelCoord): Promise<bigint[]> {
        const result = await this.#rateLimitedRequest(
            `balances/${coord.x}/${coord.y}`, 8*NUM_COLOURS
        );
        const ds = new Deserialiser(result);
        return range(NUM_COLOURS).map(() => ds.uint64());
    }

}

