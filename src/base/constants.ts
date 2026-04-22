// TODO: setup process.env.WEB3AUTH_VERSION in rollup build config
export const sdkVersion = process.env.WEB3AUTH_VERSION || "9.0.0";

export type { BUTTON_POSITION_TYPE, ChainNamespaceType, ModalSignInMethodType, WidgetType } from "@web3auth/no-modal";
export { BUTTON_POSITION, CHAIN_NAMESPACES } from "@toruslabs/base-controllers";
export { SMART_ACCOUNT } from "@toruslabs/ethereum-controllers";
