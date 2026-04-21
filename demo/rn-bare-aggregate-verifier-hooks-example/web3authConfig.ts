import { WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import { type Web3AuthContextConfig } from "@web3auth/react-native-sdk";

// IMP START - Dashboard Registration
const clientId = "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - SDK Initialization
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    redirectUrl: "rnbareaggverifhooksexample://auth",
    network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    enableLogging: true,
  },
};
// IMP END - SDK Initialization

export default web3AuthContextConfig;
