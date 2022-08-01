// Copyright 2022 Matthew Mitchell

import P2putAddrGenerator from "./P2putAddrGenerator";
import PixelAddrGenerator from "./PixelAddrGenerator";
import PixelCoord from "./PixelCoord";

export default class P2putPixelAddrGenerator implements PixelAddrGenerator {
    #addrGen: P2putAddrGenerator;

    constructor(bechPrefix: string, burnPrefix: number[]) {
        this.#addrGen = new P2putAddrGenerator(bechPrefix, burnPrefix);
    }

    forPixelColour(coord: PixelCoord, colourId: number): string {
        // Serialise coordinates into 5 byte app data for end of P2PUT address

        const buf = new ArrayBuffer(5);
        const dv = new DataView(buf);

        dv.setUint16(0, coord.x);
        dv.setUint16(2, coord.y);
        dv.setUint8(4, colourId);

        return this.#addrGen.withData(buf);

    }

}

