// Copyright 2022 Matthew Mitchell

import {Client, Server} from "mock-socket";
import {NUM_COLOURS} from "../src/constants";
import {range, sleep} from "../src/utils";

export function getMockBalances(): bigint[] {

    const balances = range(NUM_COLOURS-1).map(i => BigInt(i));
    balances.push(BigInt("0x1122334455667788"));

    return balances;

}

export function balancesToBuffer(balances: bigint[]): ArrayBuffer {

    const buffer = new ArrayBuffer(8*NUM_COLOURS+1);
    const dv = new DataView(buffer);
    dv.setUint8(0, 15);
    range(NUM_COLOURS).forEach(i => dv.setBigUint64(i*8+1, balances[i]));

    return buffer;

}

export function getWsClient(server: Server): Promise<Client> {
    return new Promise((resolve) => {
        server.on("connection", (socket) => {
            resolve(socket);
        });
    });
}

export async function waitForCall(fn: any) { // eslint-disable-line
    // Simple solution is to poll mock function
    while (fn.mock.calls.length == 0)
        await sleep(50); // eslint-disable-line no-await-in-loop
}

export function mockCallbackToPromise(fn: any) { // eslint-disable-line
    return new Promise((resolve) => {
        fn.mockImplementation(resolve);
    });
}

