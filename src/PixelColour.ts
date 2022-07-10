// Copyright 2022 Matthew Mitchell

import Colour from "./Colour";
import Deserialiser from "./Deserialiser";
import { NUM_COLOURS } from "./constants";

export default class PixelColour {
    x: number;
    y: number;
    colourId: number;

    constructor(x: number, y: number, colourId: number) {
        this.x = x;
        this.y = y;
        this.colourId = colourId;
        if (this.colourId >= NUM_COLOURS)
            throw RangeError("Colour ID is out of range 0-15");
    }

    static fromDeserialiser(ds: Deserialiser) {
        return new PixelColour(ds.uint16(), ds.uint16(), ds.uint8());
    }

    get colour(): Colour {
        return Colour.fromId(this.colourId);
    }

}

