// Copyright 2021 Matthew Mitchell

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function range(i: number) {
    return [...Array(i).keys()];
}

export function getErrorMessage(error: unknown) {
    return (error instanceof Error) ? error.message : String(error);
}

export function nop() { /* NOP */ }

