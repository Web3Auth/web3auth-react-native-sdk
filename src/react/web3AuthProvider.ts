import { createElement, PropsWithChildren } from "react";

import { Web3AuthInnerProvider } from "./context/web3AuthInnerContext";
import { Web3AuthProviderProps } from "./interfaces";

export function Web3AuthProvider({ storage, webBrowser, config, children }: PropsWithChildren<Web3AuthProviderProps>) {
  return createElement(Web3AuthInnerProvider, { storage, webBrowser, config }, children);
}
