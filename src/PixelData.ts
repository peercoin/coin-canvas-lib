// Copyright 2022 Matthew Mitchell

import Colour from "./Colour";

interface PixelColourData {
    balance: bigint;
    address: string;
    colour: Colour;
}

export type PixelData = PixelColourData[];

