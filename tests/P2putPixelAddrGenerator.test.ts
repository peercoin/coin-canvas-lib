// Copyright 2022 Matthew Mitchell

import P2putPixelAddrGenerator from "../src/P2putPixelAddrGenerator";

test("can encode addresses", () => {

    const gen = new P2putPixelAddrGenerator("tpc", [0xc7, 0x66, 0xce, 0xc1, 0xef]);

    expect(
        gen.forPixelColour(0, 0, 0)
    ).toEqual("tpc1qcanvas0000000000000000000000000000000000000qqqqqqqqq8e09fm");

    expect(
        gen.forPixelColour(1, 1, 1)
    ).toEqual("tpc1qcanvas0000000000000000000000000000000000000qqqgqqyqs3trtgu");

    expect(
        gen.forPixelColour(999, 999, 15)
    ).toEqual("tpc1qcanvas0000000000000000000000000000000000000q8ecruu8sascjrf");

});

