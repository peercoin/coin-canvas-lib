// Copyright 2022 Matthew Mitchell

import Colour from "./Colour";
import PixelAddrGenerator from "./PixelAddrGenerator";
import PixelBalances from "./PixelBalances";
import PixelCoord from "./PixelCoord";

export interface PixelColourData {
    balance: bigint;
    colour: Colour;
    address: string;
}

/**
 * Includes the address in addition to the balances for each pixel colour.
 */
export default class PixelData {
    active: Colour;
    colours: PixelColourData[];

    constructor(
        coord: PixelCoord, balances: PixelBalances, addrGen: PixelAddrGenerator
    ) {
        this.active = balances.active;
        this.colours = balances.colours.map(c => ({
            balance: c.balance,
            colour: c.colour,
            address: addrGen.forPixelColour(coord, c.colour.id)
        }));
    }

}

