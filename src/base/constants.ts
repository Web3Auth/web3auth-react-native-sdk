// TODO: setup process.env.WEB3AUTH_VERSION in rollup build config
export const sdkVersion = process.env.WEB3AUTH_VERSION || "9.0.0";

export const CHAIN_NAMESPACES = {
  EIP155: "eip155",
  SOLANA: "solana",
  OTHER: "other",
} as const;

export const MODAL_SIGN_IN_METHODS = {
  SOCIAL: "social",
  PASSWORDLESS: "passwordless",
  EXTERNAL_WALLETS: "externalWallets",
} as const;

export const WIDGET_TYPE = {
  MODAL: "modal",
  EMBED: "embed",
} as const;

export const SMART_ACCOUNT_WALLET_SCOPE = {
  EMBEDDED: "embedded",
  ALL: "all",
} as const;

export const SMART_ACCOUNT = {
  BICONOMY: "biconomy",
  KERNEL: "kernel",
  SAFE: "safe",
  TRUST: "trust",
  LIGHT: "light",
  SIMPLE: "simple",
  NEXUS: "nexus",
  METAMASK: "metamask",
} as const;

export const BUTTON_POSITION = {
  BOTTOM_LEFT: "bottom-left",
  TOP_LEFT: "top-left",
  BOTTOM_RIGHT: "bottom-right",
  TOP_RIGHT: "top-right",
} as const;
