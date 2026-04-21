import { type AccountAbstractionConfig, WEB3AUTH_NETWORK, type Web3AuthContextConfig } from "@web3auth/react-native-sdk";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

// IMP START - Whitelist bundle ID
const redirectUrl =
  // @ts-expect-error - Guest is not a valid AppOwnership
  Constants.appOwnership == AppOwnership.Expo || Constants.appOwnership == AppOwnership.Guest
    ? Linking.createURL("web3auth", {})
    : Linking.createURL("web3auth", { scheme: "web3authexpohooksexample" });
// IMP END - Whitelist b"web3auth", { scheme: "web3authexpohooksexample"

// IMP START - Account Abstraction
const AAConfig: AccountAbstractionConfig = {
  smartAccountType: "safe",
};
// IMP END - Account Abstraction

// IMP START - SDK Initialization
export const getWeb3AuthConfig = (withAA: boolean): Web3AuthContextConfig => ({
  web3AuthOptions: {
    clientId,
    redirectUrl,
    network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    // IMP START - Account Abstraction
    accountAbstractionConfig: withAA ? AAConfig : null,
    // IMP END - Account Abstraction
  },
});
// IMP END - SDK Initialization
