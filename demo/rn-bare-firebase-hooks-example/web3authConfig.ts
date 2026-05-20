import { WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import { type Web3AuthContextConfig } from "@web3auth/react-native-sdk";

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - SDK Initialization
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    redirectUrl: "web3authrnbarefirebase://auth",
    network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  },
};
// IMP END - SDK Initialization

export default web3AuthContextConfig;
