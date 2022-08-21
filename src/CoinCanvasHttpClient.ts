// Copyright 2022 Matthew Mitchell

import {Mutex} from "async-mutex";
import binaryHttpRequest from "./binaryHttpRequest";
import { NUM_COLOURS } from "./constants";
import Deserialiser from "./Deserialiser";
import PixelBalances from "./PixelBalances";
import PixelCoord from "./PixelCoord";
import { sleep } from "./utils";

export default class CoinCanvasHttpClient {
    #url: string;
    #rateLimitMs: number;
    #lastRequestMs: number;
    #timeout: number;
    #nodeOrigin?: string;
    #requestMutex = new Mutex(); // Ensures requests are run sequentially

    constructor(
        { url, rateLimitMs, timeout, nodeOrigin } : {
            url: string,
            rateLimitMs: number,
            timeout: number,
            nodeOrigin?: string
        }
    ) {

        // Ensure there is a trailing slash on the url
        this.#url = url.endsWith("/") ? url : `${url}/`;

        // Add 5ms to rate limit to account for rounding errors
        this.#rateLimitMs = rateLimitMs + 5;
        this.#timeout = timeout;

        this.#lastRequestMs = 0;
        this.#nodeOrigin = nodeOrigin;

    }

    #rateLimitedRequest(path: string, length: number): Promise<ArrayBuffer> {

        // All requests are run sequentially to ensure the rate limit is
        // being enforced
        return this.#requestMutex.runExclusive(async () => {

            const nextReqMs = this.#lastRequestMs + this.#rateLimitMs;
            const waitMs = nextReqMs - Date.now();
            if (waitMs > 0) await sleep(waitMs);

            try {
                return binaryHttpRequest({
                    url: this.#url + path,
                    length,
                    timeout: this.#timeout,
                    headers: this.#nodeOrigin === undefined
                        ? {} : { "Origin": this.#nodeOrigin }
                });
            } finally {
                // Even with an error, set the request response time
                this.#lastRequestMs = Date.now();
            }

        });

    }

    async pixelBalances(coord: PixelCoord): Promise<PixelBalances> {
        const result = await this.#rateLimitedRequest(
            `balances/${coord.x}/${coord.y}`, 8*NUM_COLOURS
        );
        const ds = new Deserialiser(result);
        return PixelBalances.fromDeserialiser(ds);
    }

}

