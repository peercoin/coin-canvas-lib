// Copyright 2022 Matthew Mitchell

import Deserialiser from "./Deserialiser";
import PixelColour from "./PixelColour";
import {getErrorMessage, range} from "./utils";

const RESPONSE_UPDATE_COLOURS = 0;
const MAX_UPDATES = 1000*1000;

/**
 * Encapsulates a connection to the web socket API.
 */
export default class CoinCanvasWebSocketClient {
    #ws: WebSocket;

    /**
     * @param args.onOpen Called when the socket has been opened.
     * @param args.onClose Called when the socket closes for any reason or the socket has
     * failed to open.
     * @param args.onPixelColours The {PixelColour}s received from the server.
     */
    constructor(args: {
        url: string,
        onOpen: () => void,
        onClose: (reason: string) => void,
        onPixelColours: (colours: PixelColour[]) => void,
    }) {

        this.#ws = new WebSocket(args.url);

        this.#ws.binaryType = "arraybuffer";
        this.#ws.onclose = (e: CloseEvent) => args.onClose(e.reason);
        this.#ws.onopen = args.onOpen;
        this.#ws.onmessage = (event: MessageEvent) => {

            if (!(event.data instanceof ArrayBuffer)) {
                args.onClose("Websocket provided non-binary data");
                return;
            }

            try {

                const ds = new Deserialiser(event.data);
                const mid = ds.uint8();

                if (mid != RESPONSE_UPDATE_COLOURS)
                    // Ignore other message types
                    return;

                const len = ds.varint();
                if (len < 1)
                    args.onClose("No colours provided");
                if (len > MAX_UPDATES)
                    args.onClose("Too many updated colours provided");

                const colours = range(Number(len)).map(() => PixelColour.fromDeserialiser(ds));
                args.onPixelColours(colours);

            } catch (e) {
                args.onClose(`Could not parse server data: ${getErrorMessage(e)}`);
            }

        };

    }

    close() {
        this.#ws.close();
    }

}

