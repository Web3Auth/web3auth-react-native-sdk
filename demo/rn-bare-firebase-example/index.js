// Web3Auth setup - must be imported first before any other imports
// Includes URL, crypto, and Buffer polyfills via the SDK setup entry
import "@web3auth/react-native-sdk/setup";

import { AppRegistry } from "react-native";

import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
