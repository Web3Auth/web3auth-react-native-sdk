import { getED25519Key as authGetED25519Key } from "@web3auth/auth";
import { describe, expect, it } from "vitest";

import { getED25519Key } from "./ed25519Key";

const DETERMINISTIC_SEED = "0x1111111111111111111111111111111111111111111111111111111111111111";

describe("getED25519Key", () => {
  it("delegates 32-byte seeds to @web3auth/auth", () => {
    const fromAuth = authGetED25519Key(DETERMINISTIC_SEED);
    const normalized = getED25519Key(DETERMINISTIC_SEED);

    expect(normalized.sk).toEqual(fromAuth.sk);
    expect(normalized.pk).toEqual(fromAuth.pk);
    expect(normalized.sk.byteLength).toBe(64);
    expect(normalized.pk.byteLength).toBe(32);
  });

  it("accepts a 64-byte Solana secret key without re-deriving the public key", () => {
    const fromAuth = authGetED25519Key(DETERMINISTIC_SEED);
    const secretKeyHex = Array.from(fromAuth.sk)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const normalized = getED25519Key(secretKeyHex);

    expect(normalized.sk).toEqual(fromAuth.sk);
    expect(normalized.pk).toEqual(fromAuth.sk.slice(32, 64));
  });

  it("accepts a 0x-prefixed 64-byte Solana secret key", () => {
    const fromAuth = authGetED25519Key(DETERMINISTIC_SEED);
    const secretKeyHex = `0x${Array.from(fromAuth.sk)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;

    const normalized = getED25519Key(secretKeyHex);

    expect(normalized.sk).toEqual(fromAuth.sk);
    expect(normalized.pk).toEqual(fromAuth.sk.slice(32, 64));
  });
});
