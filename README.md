# Web3Auth React Native SDK

Web3Auth is where passwordless auth meets non-custodial key infrastructure for Web3 apps and wallets. By aggregating OAuth (Google, Twitter, Discord) logins, different wallets and innovative Multi Party Computation (MPC) - Web3Auth provides a seamless login experience to every user on your application.

## 📖 Documentation

Checkout the official [Web3Auth Documentation](https://web3auth.io/docs) and [SDK Reference](https://web3auth.io/docs/sdk/pnp/react-native) to get started!

## 💡 Features

- Plug and Play, OAuth based Web3 Authentication Service
- Fully decentralized, non-custodial key infrastructure
- End to end Whitelabelable solution
- Threshold Cryptography based Key Reconstruction
- Multi Factor Authentication Setup & Recovery (Includes password, backup phrase, device factor editing/deletion etc)
- Support for WebAuthn & Passwordless Login
- Support for connecting to multiple wallets
- DApp Active Session Management

...and a lot more

## ⏪ Requirements

- Node.js 22+
- npm 10+
- For iOS, only iOS 12+ is supported since we require `ASWebAuthenticationSession`.
- For Android, Custom Tab support is required.

## Selecting your Workflow

In React Native, you have the choice to use one of the following workflows:

- **Bare Workflow**: Your React Native app is entirely built on your own machine. You can customize your app with Swift/Kotlin native modules.
- **Expo Managed Workflow**: Your React Native Expo app is built on Expo's cloud, so you don't have control over the native modules used in the app.

## ⚡ Installation

```sh
npm install @web3auth/react-native-sdk
```

Install the workflow-specific browser and secure storage packages next.

### Bare workflow dependencies

```sh
npm install @toruslabs/react-native-web-browser react-native-encrypted-storage
npm install --save-optional react-native-quick-crypto
```

### Expo managed workflow dependencies

```sh
npx expo install expo-web-browser expo-secure-store expo-linking expo-constants
npm install --save-optional react-native-quick-crypto
```

`react-native-quick-crypto` is optional but recommended. Without it, Metro falls back to `crypto-browserify`.

## 🛠️ Metro & Entry Setup

Web3Auth requires Metro polyfills and a setup import before any other app code.

### Metro configuration

Wrap your Metro config with `withWeb3Auth`:

**Bare**

```js
const { getDefaultConfig } = require("@react-native/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = withWeb3Auth(config);
```

**Expo**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withWeb3Auth } = require("@web3auth/react-native-sdk/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = withWeb3Auth(config);
```

### Entry point setup

Import the setup module first in your root entry file (`index.js` / `index.ts`):

```js
import "@web3auth/react-native-sdk/setup";

// ... rest of your app entry
```

## 🌟 Configuration

### Configure your Web3Auth project

Hop on to the [Web3Auth Dashboard](https://dashboard.web3auth.io/) and create a new project. Use the **Client ID** of the project to start your integration.

![Web3Auth Dashboard](https://web3auth.io/docs/assets/images/project_plug_n_play-89c39ec42ad993107bb2485b1ce64b89.png)

- Choose a custom URL scheme for your app (for example `web3authrnexample`). This does **not** have to match your Android package name or iOS bundle identifier.
- Add the exact `redirectUrl` you will pass to the SDK (for example `web3authrnexample://auth`) to **Whitelist URLs**.
- Copy the **Client ID** for usage later.

### Bare workflow — Android intent-filter

The scheme portion of `redirectUrl` must be registered in `AndroidManifest.xml` so the auth browser can return to your app.

Inside your `MainActivity`, add a browsable deep-link intent filter:

```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask"
  android:exported="true">
  <!-- existing MAIN/LAUNCHER intent-filter -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="web3authrnexample" />
  </intent-filter>
</activity>
```

Replace `web3authrnexample` with the scheme used in your `redirectUrl`.

### Bare workflow — iOS CFBundleURLTypes

Register the same scheme in your iOS `Info.plist` via `CFBundleURLTypes`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>web3authrnexample</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>web3authrnexample</string>
    </array>
  </dict>
</array>
```

### Expo managed workflow — scheme & redirectUrl

When using Expo, install the Expo browser/storage packages (see Installation) and declare a scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "web3authexpoexample"
  }
}
```

Derive `redirectUrl` with `expo-linking`. Expo Go and standalone/dev-client builds produce different URLs — whitelist **both** in the dashboard:

```js
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";

const redirectUrl =
  Constants.appOwnership === AppOwnership.Expo || Constants.appOwnership === AppOwnership.Guest
    ? Linking.createURL("web3auth", {})
    : Linking.createURL("web3auth", { scheme: "web3authexpoexample" });
```

Standalone builds resolve to a URL like `web3authexpoexample://web3auth`. Expo Go resolves to an `exp://…/--/web3auth` URL for your current session.

### Register the redirect URL in the dashboard

Whitelist the **literal** `redirectUrl` string your app passes to the SDK:

| Workflow                     | Example `redirectUrl`                         |
| ---------------------------- | --------------------------------------------- |
| Bare                         | `web3authrnexample://auth`                    |
| Expo standalone / dev client | `web3authexpoexample://web3auth`              |
| Expo Go                      | output of `Linking.createURL("web3auth", {})` |

## 📊 Analytics

The SDK sends anonymous usage events to Segment so Web3Auth can improve reliability and feature coverage.

**What is tracked (SDK-observable events):**

- SDK initialization (completed / failed / keystore corrupted)
- Connection, logout, MFA enablement/management, identity token
- Wallet UI open and wallet `request()` flows
- Initialization properties include chain metadata (CAIP ids, display names, RPC hostnames), whitelabel flags, account abstraction config, and wallet services config

**Not tracked from React Native today:**

- Hosted auth/wallet UI interactions such as user consent accept/decline and Terms of Service / Privacy Policy clicks. Those live inside the auth/wallet webviews and will only be trackable if a redirect/event contract is added later.

**Defaults and controls:**

| Option                   | Default      | Behavior                                                                 |
| ------------------------ | ------------ | ------------------------------------------------------------------------ |
| _(none)_                 | —            | Analytics **enabled**; uses the production Segment write key             |
| `buildEnv: DEVELOPMENT`  | `PRODUCTION` | Uses the development Segment write key                                   |
| `disableAnalytics: true` | `false`      | Suppress all identify/track calls                                        |

```js
const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
  clientId,
  network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  redirectUrl: "web3authrnexample://auth",
  // buildEnv: BUILD_ENV.DEVELOPMENT, // QA only; uses the development Segment write key
  // disableAnalytics: true,          // full opt-out
});
```

When using `Web3AuthProvider`, `integration_type` is set to `"React Hooks"`. Direct `new Web3Auth(...)` usage reports `"Native SDK"`.

## 💥 Initialization & Usage

Create a `Web3Auth` instance with your browser adapter, secure storage adapter, and project options. Call `init()` before `connectTo()`.

### Bare Workflow

```js
import "@web3auth/react-native-sdk/setup";

import * as WebBrowser from "@toruslabs/react-native-web-browser";
import Web3Auth, { AUTH_CONNECTION, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import EncryptedStorage from "react-native-encrypted-storage";

const scheme = "web3authrnexample";
const redirectUrl = `${scheme}://auth`;

const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
  clientId,
  network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  redirectUrl,
});

await web3auth.init();

await web3auth.connectTo({
  authConnection: AUTH_CONNECTION.GOOGLE,
});
```

### Expo Managed Workflow

```js
import "@web3auth/react-native-sdk/setup";

import Web3Auth, { AUTH_CONNECTION, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

const redirectUrl =
  Constants.appOwnership === AppOwnership.Expo || Constants.appOwnership === AppOwnership.Guest
    ? Linking.createURL("web3auth", {})
    : Linking.createURL("web3auth", { scheme: "web3authexpoexample" });

const web3auth = new Web3Auth(WebBrowser, SecureStore, {
  clientId,
  network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  redirectUrl,
});

await web3auth.init();

await web3auth.connectTo({
  authConnection: AUTH_CONNECTION.GOOGLE,
});
```

## 🩹 Examples

Checkout the examples for your preferred blockchain and platform in our [examples](https://web3auth.io/docs/examples)

## 🌐 Demo

Checkout the [Web3Auth Demo](https://demo-app.web3auth.io/) to see how Web3Auth can be used in an application.

Further checkout the [demo folder](https://github.com/Web3Auth/web3auth-react-native-sdk/tree/master/demo) within this repository, which contains sample bare and Expo apps.

## 💬 Troubleshooting and Support

- Have a look at our [Community Portal](https://community.web3auth.io/) to see if anyone has any questions or issues you might be having. Feel free to create new topics and we'll help you out as soon as possible.
- Checkout our [Troubleshooting Documentation Page](https://web3auth.io/docs/troubleshooting) to know the common issues and solutions.
- For Priority Support, please have a look at our [Pricing Page](https://web3auth.io/pricing.html) for the plan that suits your needs.
