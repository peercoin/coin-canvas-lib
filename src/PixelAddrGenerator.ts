// Copyright 2022 Matthew Mitchell

interface PixelAddrGenerator {
    forPixelColour(x: number, y: number, colourId: number): string;
}

export default PixelAddrGenerator;

