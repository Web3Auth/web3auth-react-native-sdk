const { install: installEd25519Polyfill } = require("@solana/webcrypto-ed25519-polyfill");

installEd25519Polyfill();

if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    return controller.signal;
  };
}

const win = typeof globalThis.window !== "undefined" ? globalThis.window : globalThis;
if (typeof globalThis.window === "undefined") {
  globalThis.window = win;
}

if (typeof win.addEventListener !== "function") {
  const listeners = new Map();

  win.addEventListener = (type, listener) => {
    const set = listeners.get(type) ?? new Set();
    set.add(listener);
    listeners.set(type, set);
  };

  win.removeEventListener = (type, listener) => {
    listeners.get(type)?.delete(listener);
  };

  win.dispatchEvent = (event) => {
    const set = listeners.get(event.type);
    if (set) {
      for (const listener of Array.from(set)) {
        listener.call(win, event);
      }
    }
    return true;
  };
}
