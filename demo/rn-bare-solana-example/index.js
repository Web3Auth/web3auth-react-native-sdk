// IMP START - Web3Auth Setup
// Must be the very first import — core setup plus Solana runtime polyfills
import "@web3auth/react-native-sdk/setup-solana";
// IMP END - Web3Auth Setup

import { AppRegistry } from "react-native";

import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
