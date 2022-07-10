// Copyright 2022 Matthew Mitchell

import axios from "axios";
import {jest} from "@jest/globals";
import CoinCanvasHttpClient from "../src/CoinCanvasHttpClient";
import {sleep} from "../src/utils";
import {getMockBalances, balancesToBuffer} from "./utils";

jest.mock("axios");

test("can read balances with rate limited delay", async () => {

    const balances = getMockBalances();
    (axios.get as jest.Mock).mockResolvedValue(
        { data: balancesToBuffer(balances) }
    );

    const client = new CoinCanvasHttpClient("", 100);

    async function expectBalances() {
        expect(await client.pixelBalances(0, 0)).toStrictEqual(balances);
    }

    const beforeFirstMs = Date.now();
    await expectBalances();
    await expectBalances();
    const afterSecondMs = Date.now();

    const durationMs = afterSecondMs - beforeFirstMs;
    expect(durationMs).toBeGreaterThanOrEqual(100);
    expect(durationMs).toBeLessThan(200);

    // There should be no delay if waiting before calling again
    await sleep(100);
    const beforeCallMs = Date.now();
    await expectBalances();
    expect(Date.now() - beforeCallMs).toBeLessThan(80);

});

