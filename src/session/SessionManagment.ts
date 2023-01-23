import * as CryptoJS from 'crypto-js';
import secp256k1 from '@wangshijun/secp256k1';

CryptoJS.enc.Uint8Array = {
    parse: function (u8Array: Uint8Array) {
        var words = [], i = 0, len = u8Array.length;

        while (i < len) {
            words.push(
                (u8Array[i++] << 24) |
                (u8Array[i++] << 16) |
                (u8Array[i++] << 8) |
                (u8Array[i++])
            );
        }

        return {
            sigBytes: words.length * 4,
            words: words
        };
    },

    stringify: function (words: CryptoJS.Words) {
        const dataArray = new Uint8Array(words.sigBytes);
        for (let i = 0x0; i < words.sigBytes; i++) {
            dataArray[i] = words.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
        }
        return new Uint8Array(dataArray);
    }
}

function Uint8ArrayToHex(uint8: Uint8Array) {
    return Array.from(uint8).map(function(i) {
      return ('0' + i.toString(16)).slice(-2);
    }).join('');
}

function HexToUint8Array(hex: string) {
    return Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}


export class SessionManagement {
    key: CryptoJS.Words;
    iv: CryptoJS.Words;

    constructor(privateKeyHex: string, ephemPublicKeyHex: string, encryptionIvHex: string) {
        const ecdhPointX = secp256k1.ecdh(HexToUint8Array(ephemPublicKeyHex), HexToUint8Array(privateKeyHex), {
                hashfn : function(x: any, y: any) {
                    const pubKey = new Uint8Array(32);
                    pubKey.set(x, 0);
                    return pubKey;
                }
            }, new Uint8Array(32)
        );
        
        this.key = CryptoJS.enc.Uint8Array.parse(
            CryptoJS.SHA512(CryptoJS.enc.Uint8Array.parse(ecdhPointX)).toString(CryptoJS.enc.Uint8Array).subarray(0, 32)
        );
        this.iv = CryptoJS.enc.Hex.parse(encryptionIvHex);
    }

    decrypt(text: string) {
        const data = CryptoJS.enc.Base64.stringify(
            CryptoJS.enc.Hex.parse(text)
        );

        var decrypted = CryptoJS.AES.decrypt(data, this.key, {iv: this.iv});
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    encrypt(text: string) {
        var encrypted = CryptoJS.AES.encrypt(text, this.key, {iv: this.iv});
        return encrypted.toString(CryptoJS.enc.Utf8);
    }

    static getPubKey(privateKey: string): string {
        const pubKey = secp256k1.publicKeyCreate(CryptoJS.enc.Hex.parse(privateKey).toString(CryptoJS.enc.Uint8Array), false);
        return Uint8ArrayToHex(pubKey);
    }

    static getECDSASignature(privateKey: string, data: string): string {
        var privKey = CryptoJS.enc.Hex.parse(privateKey)
        var sign = secp256k1.ecdsaSign(
            CryptoJS.SHA3(data, { outputLength: 256 }).toString(CryptoJS.enc.Uint8Array), privKey.toString(CryptoJS.enc.Uint8Array)
        );
        var signature = CryptoJS.enc.Uint8Array.parse(sign.signature);
        return CryptoJS.enc.Hex.stringify(signature);
    }
}