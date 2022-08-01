// Copyright 2022 Matthew Mitchell

import PixelCoord from "./PixelCoord";

interface PixelAddrGenerator {
    forPixelColour(coord: PixelCoord, colourId: number): string;
}

export default PixelAddrGenerator;

