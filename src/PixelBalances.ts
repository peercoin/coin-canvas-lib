// Copyright 2022 Matthew Mitchell

import * as utils from "./utils";
import Colour from "./Colour";
import {NUM_COLOURS} from "./constants";
import Deserialiser from "./Deserialiser";

export interface PixelColourBalance {
    balance: bigint;
    colour: Colour;
}

export default class PixelBalances {
    active: Colour;
    colours: PixelColourBalance[];

    constructor(active: Colour, colours: PixelColourBalance[]) {
        this.active = active;
        this.colours = colours;
    }

    static fromDeserialiser(ds: Deserialiser) {
        return new PixelBalances(
            Colour.fromId(ds.uint8()),
            utils.range(NUM_COLOURS).map(i => ({
                balance: ds.uint64(),
                colour: Colour.fromId(i)
            }))
        );
    }

}

