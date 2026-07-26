import { ChainNotConfiguredError, createConnector, type CreateConnectorFn, ProviderNotFoundError } from "@wagmi/core";
import { WEB3AUTH_CONNECTOR_ID } from "@web3auth/no-modal";
import type { Address, EIP1193Provider } from "viem";
import { getAddress, isAddress, numberToHex, SwitchChainError, UserRejectedRequestError } from "viem";

import { log } from "../../base/loglevel";

export { WEB3AUTH_CONNECTOR_ID };

export type DisconnectOrigin = "web3auth" | "wagmi" | null;

export type Web3AuthConnectorParams = {
  getProvider: () => EIP1193Provider | null | undefined;
  getDisconnectOrigin?: () => DisconnectOrigin;
  setDisconnectOrigin?: (origin: DisconnectOrigin) => void;
  onWagmiDisconnect?: () => Promise<void>;
};

type ProviderWithEvents = EIP1193Provider & {
  on?(event: string, listener: (...args: never[]) => void): void;
  removeListener?(event: string, listener: (...args: never[]) => void): void;
};

function normalizeAccounts(accounts: string[]): Address[] {
  if (accounts.length === 0) {
    throw new Error("No accounts returned by Web3Auth provider");
  }
  return accounts.map((account) => getAddress(account));
}

function parseChainId(chainId: string | number): number {
  if (typeof chainId === "number") return chainId;
  return Number.parseInt(chainId, 16);
}

export function createWeb3AuthConnector(params: Web3AuthConnectorParams): CreateConnectorFn {
  const { getProvider, getDisconnectOrigin, setDisconnectOrigin, onWagmiDisconnect } = params;

  let accountsChanged: ((accounts: string[]) => void) | undefined;
  let chainChanged: ((chainId: string) => void) | undefined;
  let disconnectListener: ((error?: Error) => void) | undefined;
  let boundProvider: ProviderWithEvents | null = null;

  const removeProviderListeners = () => {
    if (boundProvider) {
      if (accountsChanged) boundProvider.removeListener?.("accountsChanged", accountsChanged as never);
      if (chainChanged) boundProvider.removeListener?.("chainChanged", chainChanged as never);
      if (disconnectListener) boundProvider.removeListener?.("disconnect", disconnectListener as never);
    }
    accountsChanged = undefined;
    chainChanged = undefined;
    disconnectListener = undefined;
    boundProvider = null;
  };

  return createConnector((config) => ({
    id: WEB3AUTH_CONNECTOR_ID,
    name: "Web3Auth",
    type: "web3auth",
    async getProvider() {
      const provider = getProvider() as ProviderWithEvents | null | undefined;
      if (!provider) throw new ProviderNotFoundError();
      return provider;
    },
    async getAccounts() {
      const provider = await this.getProvider();
      const accounts = (await provider.request({ method: "eth_accounts", params: [] })) as string[];
      return normalizeAccounts(accounts);
    },
    async getChainId() {
      const provider = await this.getProvider();
      const chainId = (await provider.request({ method: "eth_chainId", params: [] })) as string;
      return parseChainId(chainId);
    },
    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return accounts.length > 0;
      } catch {
        return false;
      }
    },
    async connect({ withCapabilities } = {}) {
      const provider = await this.getProvider();
      // Existing Web3Auth sessions are already authorized; never prompt again.
      const accounts = await this.getAccounts();
      const chainId = await this.getChainId();

      if (boundProvider && boundProvider !== provider) {
        removeProviderListeners();
      }
      boundProvider = provider;

      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this);
        provider.on?.("accountsChanged", accountsChanged as never);
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this);
        provider.on?.("chainChanged", chainChanged as never);
      }
      if (!disconnectListener) {
        disconnectListener = this.onDisconnect.bind(this);
        provider.on?.("disconnect", disconnectListener as never);
      }

      return {
        accounts: (withCapabilities ? accounts.map((address) => ({ address, capabilities: {} })) : accounts) as never,
        chainId,
      };
    },
    async disconnect() {
      const origin = getDisconnectOrigin?.() ?? null;
      if (origin === "web3auth") {
        removeProviderListeners();
        return;
      }

      setDisconnectOrigin?.("wagmi");
      try {
        if (onWagmiDisconnect) await onWagmiDisconnect();
      } finally {
        removeProviderListeners();
        queueMicrotask(() => {
          if (getDisconnectOrigin?.() === "wagmi") setDisconnectOrigin?.(null);
        });
      }
    },
    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      const chain = config.chains.find((item) => item.id === chainId);
      if (!chain) throw new ChainNotConfiguredError();

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: numberToHex(chainId) }],
        });
        const currentChainId = await this.getChainId();
        if (currentChainId !== chainId) {
          throw new SwitchChainError(new Error(`Failed to switch to chain ${chainId}`));
        }
        return chain;
      } catch (error) {
        const err = error as { code?: number };
        if (err.code === UserRejectedRequestError.code) throw new UserRejectedRequestError(error as Error);
        if (error instanceof SwitchChainError) throw error;
        throw new SwitchChainError(error as Error);
      }
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit("disconnect");
        return;
      }
      if (!accounts.every((account) => typeof account === "string" && isAddress(account))) {
        log.warn("onAccountsChanged::accountsChanged event received on non-EVM address");
        return;
      }
      config.emitter.emit("change", { accounts: accounts.map((account) => getAddress(account)) });
    },
    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: parseChainId(chainId) });
    },
    onDisconnect() {
      removeProviderListeners();
      config.emitter.emit("disconnect");
    },
  }));
}
