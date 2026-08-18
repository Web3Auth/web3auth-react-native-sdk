import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

describe("solana runtime polyfills", () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as { window?: unknown }).window;
  });

  it("patches AbortSignal.timeout and window event methods when missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS runtime polyfill entry
    require(path.join(__dirname, "solana-runtime-polyfills.js"));

    expect(typeof AbortSignal.timeout).toBe("function");
    expect(typeof globalThis.window?.addEventListener).toBe("function");
    expect(typeof globalThis.window?.removeEventListener).toBe("function");
    expect(typeof globalThis.window?.dispatchEvent).toBe("function");
  });

  it("does not replace existing window event methods", () => {
    const existingAdd = vi.fn();
    const existingRemove = vi.fn();
    const existingDispatch = vi.fn();

    (globalThis as { window: Window }).window = {
      addEventListener: existingAdd,
      removeEventListener: existingRemove,
      dispatchEvent: existingDispatch,
    } as Window;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS runtime polyfill entry
    require(path.join(__dirname, "solana-runtime-polyfills.js"));

    expect(globalThis.window.addEventListener).toBe(existingAdd);
    expect(globalThis.window.removeEventListener).toBe(existingRemove);
    expect(globalThis.window.dispatchEvent).toBe(existingDispatch);
  });
});

describe("setup-solana", () => {
  it("chains core setup and Solana runtime polyfills", () => {
    const setupSolanaSource = fs.readFileSync(path.join(__dirname, "setup-solana.js"), "utf8");
    expect(setupSolanaSource).toContain("./setup");
    expect(setupSolanaSource).toContain("./solana-runtime-polyfills");
  });
});
