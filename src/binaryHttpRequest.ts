// Copyright 2022 Matthew Mitchell

import axios, {AxiosRequestHeaders} from "axios";

export default async function binaryHttpRequest(
    url: string, length: number, headers: AxiosRequestHeaders
): Promise<ArrayBuffer> {

    const result = await axios.get(url, {
        validateStatus: status => status == 200,
        responseType: "arraybuffer",
        maxContentLength: length,
        timeout: 2000,
        headers
    });

    // Axios returns Buffer objects on node (which is dumb)
    // Therefore it may need to be converted
    // https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
    if (result.data.buffer !== undefined) {
        const b = result.data;
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    }

    return result.data;

}

