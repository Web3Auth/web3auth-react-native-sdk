import { fromByteArray } from "react-native-quick-base64";

global.Buffer = require("buffer").Buffer;

global.base64FromArrayBuffer = (ab) => {
    const u8 = ab instanceof Uint8Array ? ab : new Uint8Array(ab);
    return fromByteArray(u8);
};

import { install } from "react-native-quick-crypto";

install();

// Needed so that 'stream-http' chooses the right default protocol.
global.location = {
    protocol: "file:",
};

global.process.version = "v16.0.0";
if (!global.process.version) {
    global.process = require("process");
    console.log({ process: global.process });
}

process.browser = true;