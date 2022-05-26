# React Native SDK for Web3Auth

## Installation

```sh
npm install @web3auth/react-native-sdk
```

To allow the SDK to work with exported Expo Android apps, you need to place a designated scheme into `app.json`, like below:

```js
    "scheme": "web3authreactnativesdkexample",
```

## Usage

Please see [App.tsx](./example/App.tsx) for detailed example.

```js
import * as WebBrowser from "@toruslabs/react-native-web-browser";
// or  import * as WebBrowser from "expo-web-browser"; (for expo)

const web3auth = new Web3Auth(WebBrowser, {
  clientId: "BC5bANkU4-fil7C5s1uKzRfF0VGqbuaxDQiLnQ8WgF7SEA32lGegAhu7dk4dZf3Rk397blIvfWytXwsRvs9dOaQ",
  network: Network.TESTNET,
});
const state = await web3auth.login({
  loginProvider: LoginProvider.GOOGLE,
  redirectUrl: resolvedRedirectUrl,
});
```

## License

MIT
