// Copyright 2022 Matthew Mitchell

import axios from "axios";

export default async function binaryHttpRequest(
    url: string, length: number, nodeOrigin?: string
): Promise<ArrayBuffer> {

    const result = await axios.get(url, {
        validateStatus: status => status == 200,
        responseType: "arraybuffer",
        maxContentLength: length,
        timeout: 2000,
        headers: nodeOrigin ? { "Origin": nodeOrigin } : undefined
    });

    return result.data;

}

