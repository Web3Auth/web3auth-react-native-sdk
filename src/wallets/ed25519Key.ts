import { getED25519Key as authGetED25519Key } from "@web3auth/auth";

function hexToBytes(privateKey: string | Uint8Array): Uint8Array {
  if (typeof privateKey !== "string") {
    return privateKey instanceof Uint8Array ? privateKey : new Uint8Array(privateKey);
  }

  const hex = privateKey.replace(/^0x/, "");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Normalizes Web3Auth ed25519 private key material for Solana.
 *
 * Web3Auth may return either a 32-byte seed (64 hex chars) or a full 64-byte
 * Solana secret key (128 hex chars). `@web3auth/auth` only handles the 32-byte form.
 */
export function getED25519Key(privateKey: string | Uint8Array): { sk: Uint8Array; pk: Uint8Array } {
  const privKey = hexToBytes(privateKey);

  if (privKey.byteLength === 64) {
    return { sk: privKey, pk: privKey.slice(32, 64) };
  }

  return authGetED25519Key(privateKey);
}
