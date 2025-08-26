export const CHAIN_NAMESPACES = {
  EIP155: "eip155",
  SOLANA: "solana",
  CASPER: "casper",
  XRPL: "xrpl",
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
