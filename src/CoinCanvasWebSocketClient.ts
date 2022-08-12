// Copyright 2022 Matthew Mitchell

import Deserialiser from "./Deserialiser";
import PixelColour from "./PixelColour";
import {getErrorMessage, range} from "./utils";
import IsoWs from "isomorphic-ws";

const RESPONSE_UPDATE_COLOURS = 0;
const DEFAULT_MAX_UPDATES = 1000*1000;

interface Args {
    url: string,
    nodeOrigin?: string
    onOpen: () => void,
    onClose: (reason: string) => void,
    onPixelColours: (colours: PixelColour[]) => void,
    maxUpdates?: number
}

function onMessage(event: MessageEvent, args: Args) {

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
        const maxUpdates = args.maxUpdates === undefined
            ? DEFAULT_MAX_UPDATES : args.maxUpdates;

        if (len > maxUpdates) {
            args.onClose("Too many updated colours provided");
            return;
        }

        const colours = range(Number(len)).map(() => PixelColour.fromDeserialiser(ds));
        args.onPixelColours(colours);

    } catch (e) {
        args.onClose(`Could not parse server data: ${getErrorMessage(e)}`);
    }


}

/**
 * Encapsulates a connection to the web socket API.
 */
export default class CoinCanvasWebSocketClient {
    #ws: WebSocket | IsoWs;

    /**
     * @param args.nodeOrigin When running on nodejs, this can be used to set
     * the web socket Origin header for the handshake.
     * @param args.onOpen Called when the socket has been opened.
     * @param args.onClose Called when the socket closes for any reason or the socket has
     * failed to open.
     * @param args.onPixelColours The {PixelColour}s received from the server.
     */
    constructor(args: Args) {

        // Use global WebSocket if available
        this.#ws = globalThis.WebSocket
            ? new WebSocket(args.url)
            : new IsoWs(args.url, { origin: args.nodeOrigin });

        this.#ws.binaryType = "arraybuffer";
        this.#ws.onclose = (e: CloseEvent) => args.onClose(e.reason);
        this.#ws.onopen = args.onOpen;
        this.#ws.onmessage = (event: MessageEvent) => onMessage(event, args);

    }

    close() {
        this.#ws.close(1000);
    }

}

