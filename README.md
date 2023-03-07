# Web3Auth React Native SDK

Web3Auth is where passwordless auth meets non-custodial key infrastructure for Web3 apps and wallets. By aggregating OAuth (Google, Twitter, Discord) logins, different wallets and innovative Multi Party Computation (MPC) - Web3Auth provides a seamless login experience to every user on your application.

## 📖 Documentation

Checkout the official [Web3Auth Documentation](https://web3auth.io/docs) and [SDK Reference](https://web3auth.io/docs/sdk/react-native/) to get started!

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

- For iOS, only iOS 12+ supported since we requires ASWebAuthenticationSession.

- For Android, Custom Tab support is required.

## Selecting your Workflow

In React Native, you have the choice to use one of the following workflows:

- **Bare Workflow**: Your React Native app is entirely built on your own machine. You can customize your app with Swift/Kotlin native modules.
- **Expo Managed Workflow**: Your React Native Expo app is built on your Expo's cloud, so you don't have control over the native modules used in the app.

## ⚡ Installation

```sh
npm install @web3auth/react-native-sdk
```

## 🌟 Configuration

### Configure your Web3Auth project

Hop on to the [Web3Auth Dashboard](https://dashboard.web3auth.io/) and create a new project. Use the Client ID of the project to start your integration.

![Web3Auth Dashboard](https://web3auth.io/docs/assets/images/project_plug_n_play-89c39ec42ad993107bb2485b1ce64b89.png)

- Add `{YOUR_APP_PACKAGE_NAME}://auth` to **Whitelist URLs**.

- Copy the Project ID for usage later.

### Expo Managed Workflow

When using our SDK with a Expo-based React Native app (aka managed workflow, you have to install the `expo-web-browser` package as a `WebBrowser` implementation.)

```sh
expo install expo-web-browser
```

To allow the SDK to work with exported Expo Android apps, you need to place a designated scheme into `app.json`, like below:

```js
{
  "expo": {
    "scheme": "web3authexposample"
  }
}
```

### Bare workflow Configuration

When using our SDK with a bare workflow React Native app, you have to install a `WebBrowser` implementation made by us.

```sh
npm install --save @toruslabs/react-native-web-browser
```

#### Android

- The `scheme` parameter in the `redirectUrl` is specificable, and has to be added into the `AndroidManifest.xml`.

```xml
<data android:scheme="web3authrnexample" />
```

#### iOS

- The `scheme` parameter in the `redirectUrl` is specificable here as well, however, it does not need to be added as a iOS Custom URL Scheme. You may add the `scheme` to your iOS `Info.plist`, but it is not required.

#### Register the URL scheme you intended to use for redirection

- In the Web3Auth Developer Dashboard, add the URL scheme you intended to use for redirection to the **Whitelist URLs** section.

For example, the scheme mentioned is `web3authrnexample` and the `redirectUrl` mentioned is `${scheme}://openlogin`, we will whitelist:

```
web3authrnexample://openlogin
```

## 💥 Initialization & Usage

In your sign-in activity', create an `Web3Auth` instance with your Web3Auth project's configurations and 
configure it like this:

### Expo Managed Workflow

```js
import * as WebBrowser from 'expo-web-browser';
import Web3Auth, { LOGIN_PROVIDER, OPENLOGIN_NETWORK } from "@web3auth/react-native-sdk";

const web3auth = new Web3Auth(WebBrowser, {
    clientId,
    network: OPENLOGIN_NETWORK.TESTNET, // or other networks
});
const info = await web3auth.login({
    loginProvider: LOGIN_PROVIDER.GOOGLE,
    redirectUrl: resolvedRedirectUrl,
    mfaLevel: 'mandatory', // optional
    curve: 'secp256k1', // optional
});
```

### Bare Workflow

```js
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import Web3Auth, { LOGIN_PROVIDER, OPENLOGIN_NETWORK } from "@web3auth/react-native-sdk";

const web3auth = new Web3Auth(WebBrowser, {
    clientId,
    network: OPENLOGIN_NETWORK.TESTNET, // or other networks
});
const info = await web3auth.login({
    loginProvider: LOGIN_PROVIDER.GOOGLE,
    redirectUrl: resolvedRedirectUrl,
    mfaLevel: 'mandatory', // optional
    curve: 'secp256k1', // optional
});
```

## 🩹 Examples

Checkout the examples for your preferred blockchain and platform in our [examples repository](https://github.com/Web3Auth/examples/)

## 🌐 Demo

Checkout the [Web3Auth Demo](https://demo-app.web3auth.io/) to see how Web3Auth can be used in an application.

Further checkout the [example folder](https://github.com/Web3Auth/web3auth-react-native-sdk/tree/master/example) within this repository, which contains a sample app.

## 💬 Troubleshooting and Support

- Have a look at our [Community Portal](https://community.web3auth.io/) to see if anyone has any questions or issues you might be having. Feel free to reate new topics and we'll help you out as soon as possible.
- Checkout our [Troubleshooting Documentation Page](https://web3auth.io/docs/troubleshooting) to know the common issues and solutions.
- For Priority Support, please have a look at our [Pricing Page](https://web3auth.io/pricing.html) for the plan that suits your needs.
