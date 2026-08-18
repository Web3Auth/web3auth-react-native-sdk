import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, type Web3AuthContextConfig } from "@web3auth/react-native-sdk";

// IMP START - Dashboard Registration
// Get your Client ID from https://dashboard.web3auth.io
const clientId = "BFcLTVqWlTSpBBaELDPSz4_LFgG8Nf8hEltPlf3QeUG_88GDrQSw82fSjjYj5x4F3ys3ghMq8-InU7Azx7NbFSs";
// IMP END - Dashboard Registration

// IMP START - SDK Initialization
const web3AuthConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    // IMP START - Allowlist bundle ID
    redirectUrl: "solanarnexample://auth",
    // IMP END - Allowlist bundle ID
    network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    // IMP START - Chain Config
    defaultChainId: "0x66",
    // IMP END - Chain Config
  },
};
// IMP END - SDK Initialization

export default web3AuthConfig;
