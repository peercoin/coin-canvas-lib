// Copyright 2022 Matthew Mitchell

const VARINT_U16 = 253;
const VARINT_U32 = 254;

export default class Deserialiser {
    #dataView: DataView;
    #offset: number;

    constructor(bytes: ArrayBuffer) {
        this.#dataView = new DataView(bytes);
        this.#offset = 0;
    }

    uint8(): number {
        const i = this.#dataView.getUint8(this.#offset);
        this.#offset += 1;
        return i;
    }

    uint16(): number {
        const i = this.#dataView.getUint16(this.#offset);
        this.#offset += 2;
        return i;
    }

    uint32(): number {
        const i = this.#dataView.getUint32(this.#offset);
        this.#offset += 4;
        return i;
    }

    uint64(): bigint {
        const i = this.#dataView.getBigUint64(this.#offset);
        this.#offset += 8;
        return i;
    }

    varint(): bigint {
        const first = this.uint8();
        if (first < VARINT_U16) return BigInt(first);
        if (first == VARINT_U16) return BigInt(this.uint16());
        if (first == VARINT_U32) return BigInt(this.uint32());
        return this.uint64();
    }

}

