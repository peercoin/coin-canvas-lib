# coin-canvas-lib: Coin Canvas Javascript Library

This library encapsulates interaction with the coin canvas server. The
`CoinCanvasClient` class includes access to all of the underlying APIs.

The library can be built with `npm run build`. Output files are placed into
`dist` and the package can be imported normally after it has been built.

Canvas data can be handled with the `onFullCanvas` and `onUpdatedPixels`
callbacks. The `Canvas` class provides access to an `ImageData` object that can
be used to create the initial canvas. `PixelColour` objects provide information
to update these pixels with `Colour` objects where CSS colour strings can be
obtained via `cssStr()`.

`CoinCanvasClient` objects require a `PixelAddrGenerator` object which can be
provided using the `P2putPixelAddrGenerator` subclass. This expects 5 P2PUT
prefix bytes. To provide the "canvas" prefix `[0xc7, 0x66, 0xce, 0xc1, 0xef]`
can be used.

Usage examples can be seen in the tests under the `tests/` directory.

