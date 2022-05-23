# React Native SDK for Web3Auth

## Installation

```sh
npm install web3auth-react-native-sdk
```

To allow the SDK to work with exported Expo Android apps, you need to place a designated scheme into `app.json`, like below:

```js
    "scheme": "openloginexposdkexampleexpo",
```

### Bare React Native apps

If you want to use this SDK with bare React Native apps, you can take reference to the sample app in https://github.com/torusresearch/openlogin-expo-bare-sample .

## Usage

Please see [App.tsx](./openlogin-expo-sdk-example-expo/App.tsx) for detailed example.

```js
const openlogin = new OpenLogin({
  clientId:
    "BC5bANkU4-fil7C5s1uKzRfF0VGqbuaxDQiLnQ8WgF7SEA32lGegAhu7dk4dZf3Rk397blIvfWytXwsRvs9dOaQ",
  network: Network.TESTNET,
});
const state = await openlogin.login({
  loginProvider: LoginProvider.GOOGLE,
  redirectUrl: resolvedRedirectUrl,
});
```

## License

MIT
