// Copyright 2022 Matthew Mitchell

import Colour from "./Colour";
import PixelColour from "./PixelColour";
import ImageData from "@canvas/image-data";
import {range} from "./utils";

/**
 * Abstracts pixel colour data for the canvas, allowing conversion from the
 * back-end bitmap to an {ImageData} object.
 */
export default class Canvas {
    #xLen: number;
    #yLen: number;
    #rawData: Uint8Array;

    constructor(xLen: number, yLen: number, rawData: ArrayBuffer) {
        this.#xLen = xLen;
        this.#yLen = yLen;
        this.#rawData = new Uint8Array(rawData);
    }

    updatePixel(pixel: PixelColour) {

        const pos = pixel.coord.y*this.#xLen + pixel.coord.x;
        const byteOff = Math.floor(pos / 2);
        const isFirst = pos % 2 == 0;

        const mask = isFirst ? 0x0f : 0xf0;
        const value = isFirst ? pixel.colourId << 4 : pixel.colourId;
        this.#rawData[byteOff] &= mask;
        this.#rawData[byteOff] |= value;

    }

    get size() {
        return this.#xLen*this.#yLen;
    }

    get width() {
        return this.#xLen;
    }

    get height() {
        return this.#yLen;
    }

    getColourArray(): Colour[] {
        return range(this.size).map(i => this.#colourAt(i));
    }

    getImageData(): ImageData {

        const nBytes = 4*this.size;
        const data = new Uint8ClampedArray(nBytes);

        // Encode colours as RGBA
        for (let i = 0; i < this.size; i++) {

            const colour = this.#colourAt(i);

            const bytePos = i*4;
            data[bytePos] = colour.red;
            data[bytePos + 1] = colour.green;
            data[bytePos + 2] = colour.blue;
            data[bytePos + 3] = 0xff; // Alpha

        }

        return new ImageData(data, this.#xLen, this.#yLen);

    }

    #colourAt(i: number): Colour {
        const byteVal = this.#rawData[Math.floor(i / 2)];
        const colourId = (i % 2 == 0) ? byteVal >> 4 : byteVal & 0x0f;
        const c = Colour.fromId(colourId);
        return c;
    }

}

