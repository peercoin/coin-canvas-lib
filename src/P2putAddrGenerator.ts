// Copyright 2022 Matthew Mitchell

import { bech32 } from "bech32";

const BURN_PATTERN: number[] = [0x7b, 0xde, 0xf7, 0xbd, 0xef];

export default class P2putAddrGenerator {
    #bechPrefix: string;
    #bytes: Uint8Array;

    constructor(bechPrefix: string, burnPrefix: number[]) {

        if (burnPrefix.length != 5) throw Error("P2PUT prefixes must be 5 bytes");

        this.#bechPrefix = bechPrefix;

        // Add prefix to buffer
        this.#bytes = new Uint8Array(32);
        this.#bytes.set(new Uint8Array(burnPrefix), 0);

        // Add 15 burn bytes to buffer
        for (let i = 5; i <= 15; i += 5)
            this.#bytes.set(BURN_PATTERN, i);

    }

    withData(data: ArrayBufferLike): string {

        // Pad with burn pattern
        for (let i = 0; i < 12-data.byteLength; i++)
            this.#bytes[20+i] = BURN_PATTERN[i % 5];

        // Add data onto end
        this.#bytes.set(new Uint8Array(data), 32-data.byteLength);

        // Encode into bech32 address
        return bech32.encode(
            this.#bechPrefix, [0].concat(bech32.toWords(this.#bytes))
        );

    }

}

