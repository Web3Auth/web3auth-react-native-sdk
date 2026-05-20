import { type AccountAbstractionConfig, WEB3AUTH_NETWORK, type Web3AuthContextConfig } from "@web3auth/react-native-sdk";

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";
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
    // IMP START - Account Abstraction
    accountAbstractionConfig: withAA ? AAConfig : null,
    // IMP END - Account Abstraction
  },
});
// IMP END - SDK Initialization
