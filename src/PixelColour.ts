// Copyright 2022 Matthew Mitchell

import Colour from "./Colour";
import Deserialiser from "./Deserialiser";
import { NUM_COLOURS } from "./constants";
import PixelCoord from "./PixelCoord";

export default class PixelColour {
    coord: PixelCoord;
    colourId: number;

    constructor(coord: PixelCoord, colourId: number) {
        this.coord = coord;
        this.colourId = colourId;
        if (this.colourId >= NUM_COLOURS)
            throw RangeError("Colour ID is out of range 0-15");
    }

    static fromDeserialiser(ds: Deserialiser) {
        return new PixelColour({
            x: ds.uint16(),
            y: ds.uint16()
        }, ds.uint8());
    }

    get colour(): Colour {
        return Colour.fromId(this.colourId);
    }

}

