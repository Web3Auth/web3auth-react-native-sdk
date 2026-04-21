import { type AccountAbstractionConfig, type Web3AuthContextConfig, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";

// IMP START - Dashboard Registration
const clientId = "BMAtt15LpfxIshlsX0fumPV99TNfJAEPkSTEbZR2KHyr2S8P-XKodZlcJaNUTbg0gYEbyJeqi-R6ssvG0yU5X1g"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Account Abstraction
const AAConfig: AccountAbstractionConfig = {
  smartAccountType: "safe",
};
// IMP END - Account Abstraction

// IMP START - SDK Initialization
export const getWeb3AuthConfig = (withAA: boolean): Web3AuthContextConfig => ({
  web3AuthOptions: {
    clientId,
    redirectUrl: "rnbarehooksexample://auth",
    network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    accountAbstractionConfig: withAA ? AAConfig : null,
  },
});
// IMP END - SDK Initialization
