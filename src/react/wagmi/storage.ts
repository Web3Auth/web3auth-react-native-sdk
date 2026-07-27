import type { Config, Storage } from "@wagmi/core";

/**
 * Wagmi persists connections as `{ id, name, type, uid }` stubs. With
 * `reconnectOnMount: false`, those stubs are never repaired. Async RN storage can
 * finish hydration after the bridge binds a live connector and overwrite it.
 * Strip connection snapshots so only safe fields (e.g. chainId) rehydrate.
 */
function sanitizePersistedStore(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (record.state && typeof record.state === "object") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { connections: _connections, current: _current, ...stateRest } = record.state as Record<string, unknown>;
    return { ...record, state: stateRest };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { connections: _connections, current: _current, ...rest } = record;
  return rest;
}

export function createBridgeSafeStorage(storage: Storage): Storage {
  return {
    key: storage.key,
    getItem: async (key, defaultValue) => {
      const value = await storage.getItem(key as never, defaultValue as never);
      if (key === "store") return sanitizePersistedStore(value) as never;
      return value as never;
    },
    setItem: async (key, value) => {
      const next = key === "store" ? sanitizePersistedStore(value) : value;
      await storage.setItem(key as never, next as never);
    },
    removeItem: async (key) => {
      await storage.removeItem(key as never);
    },
  };
}

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (fn: () => void) => () => void;
};

/** Wait until Zustand persist hydration settles (no-op when already hydrated). */
export async function awaitWagmiStorageHydration(config: Config): Promise<void> {
  // Wagmi types the persist API loosely across storage/null configs.
  const persistApi = (config._internal.store as { persist?: PersistApi }).persist;
  if (!persistApi || persistApi.hasHydrated()) return;

  await new Promise<void>((resolve) => {
    const unsub = persistApi.onFinishHydration(() => {
      unsub();
      resolve();
    });
    if (persistApi.hasHydrated()) {
      unsub();
      resolve();
    }
  });
}
