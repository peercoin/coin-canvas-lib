// Copyright 2022 Matthew Mitchell

import binaryHttpRequest from "./binaryHttpRequest";
import { NUM_COLOURS } from "./constants";
import Deserialiser from "./Deserialiser";
import { range, sleep } from "./utils";

export default class CoinCanvasHttpClient {
    #url: string;
    #rateLimitMs: number;
    #lastRequestMs: number;

    constructor(url: string, rateLimitMs: number) {
        this.#url = url;
        this.#rateLimitMs = rateLimitMs;
        this.#lastRequestMs = 0;
    }

    async #rateLimitedRequest(path: string, length: number): Promise<ArrayBuffer> {
        const nextReqMs = this.#lastRequestMs + this.#rateLimitMs;
        const waitMs = nextReqMs - Date.now();
        if (waitMs > 0) await sleep(waitMs);
        const result = await binaryHttpRequest(this.#url + path, length);
        this.#lastRequestMs = Date.now();
        return result;
    }

    async pixelBalances(x: number, y: number): Promise<bigint[]> {
        const result = await this.#rateLimitedRequest(`/balances/${x}/${y}`, 8*NUM_COLOURS);
        const ds = new Deserialiser(result);
        return range(NUM_COLOURS).map(() => ds.uint64());
    }

}

