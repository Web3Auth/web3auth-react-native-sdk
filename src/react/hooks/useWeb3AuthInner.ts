import { useContext } from "react";

import { InitializationError } from "../../errors";
import { Web3AuthInnerContext } from "../context/web3AuthInnerContext";
import { IWeb3AuthInnerContext } from "../interfaces";

export const useWeb3AuthInner = (): IWeb3AuthInnerContext => {
  const context = useContext(Web3AuthInnerContext);
  if (!context) {
    throw InitializationError.fromCode(1000, "usage of useWeb3Auth not wrapped in `Web3AuthContextProvider`.");
  }
  return context;
};
