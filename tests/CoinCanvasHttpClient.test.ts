// Copyright 2022 Matthew Mitchell

import axios from "axios";
import {jest} from "@jest/globals";
import CoinCanvasHttpClient from "../src/CoinCanvasHttpClient";
import {sleep} from "../src/utils";
import {getMockBalances, balancesToBuffer} from "./utils";

jest.mock("axios");

/* eslint-disable max-lines-per-function */
test("can read balances with rate limited delay", async () => {

    const balances = getMockBalances();
    (axios.get as jest.Mock).mockImplementation((url) => {

        if (url.endsWith("1"))
            throw Error("Test Error");

        return { data: balancesToBuffer(balances) };

    });

    const client = new CoinCanvasHttpClient("", 100);

    async function expectBalances(throwError: boolean) {
        try {
            expect(
                await client.pixelBalances({
                    x: 0,
                    y: throwError ? 1 : 0
                })
            ).toStrictEqual(balances);
            expect(throwError).toBe(false);
        } catch {
            expect(throwError).toBe(true);
        }
    }

    async function expectWithAwait(doAwait: boolean, throwError = false) {

        const beforeFirstMs = Date.now();
        const promises = [
            expectBalances(throwError),
            expectBalances(throwError),
            expectBalances(false)
        ];

        if (doAwait) {
            // Await each in turn
            for (const p of promises) {
                await p; // eslint-disable-line
            }
        } else
            // Await all of them in parallel
            await Promise.all(promises);

        const afterSecondMs = Date.now();

        const durationMs = afterSecondMs - beforeFirstMs;
        expect(durationMs).toBeGreaterThanOrEqual(200);
        expect(durationMs).toBeLessThan(300);

        // Ensure that future executions do not get caught in the rate limit
        await sleep(100);

    }

    // Rate limit should apply if waiting for each request or where requests are
    // made in parallel
    await expectWithAwait(true);
    await expectWithAwait(false);

    // Errors allow further requests to go through whilst keeping the rate limit
    await expectWithAwait(false, true);

    // There should be no delay if waiting before calling again
    const beforeCallMs = Date.now();
    await expectBalances(false);
    expect(Date.now() - beforeCallMs).toBeLessThan(80);

});

