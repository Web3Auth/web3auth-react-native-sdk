# @web3auth/react-native-sdk

React Native SDK for Torus OpenLogin

## Installation

```sh
npm install @web3auth/react-native-sdk
```

Please refer to the native SDKs for platform-specific configuration.

- [Android SDK](https://github.com/torusresearch/openlogin-android-sdk)
- [iOS SDK](https://github.com/torusresearch/openlogin-swift-sdk)

For iOS, the redirectUrl parameter is fixed, which is `\(bundleId)://auth`, and does not need to be added as a iOS Custom URL Scheme.

For Android, the redirectUrl parameter is specificable, and has to be added into the AndroidManifest.xml.

## Usage

Refer to the demo app for more detailed example.

```js
import OpenloginReactNativeSdk, {
  LoginProvider,
  Web3authNetwork,
} from '@web3auth/react-native-sdk';

React.useEffect(() => {
  OpenloginReactNativeSdk.init({
    // Your clientId obtained from OpenLogin dashboard.
    clientId:
      'BKJ3HmEqVmMHbFeW6E-CVPmdnVrnPhdBEI82kxgBVJGtaS4XlylvAE-1gmsv_Fa1CDj-xIhvTf3Kgd6mTn8nJtw',
    // TESTNET is currently broken on iOS.
    network: Web3authNetwork.MAINNET,
    // redirectUrl only applies for Android SDK, it is designated by iOS SDK in iOS, which is \(bundleId)://auth
    redirectUrl: 'com.example.openloginreactnativesdk://auth',
  })
    .then(result => console.log(`success: ${result}`))
    .catch(err => console.log(`error: ${err}`));
}, []);

OpenloginReactNativeSdk.login({
  provider: LoginProvider.GOOGLE,
})
  .then(result => console.log(`success: ${result.privKey}, ${result.userInfo}`))
  .catch(err => console.log(`error: ${err}`))

// For iOS, it is also possible to get the default OpenLogin login screen, which let users to choose their own providers, by not specifying a provider.
// For Android, not specifying a provider will default to Google.
OpenloginReactNativeSdk.login({})
  .then(result => console.log(`success: ${result.privKey}, ${result.userInfo}`))
  .catch(err => console.log(`error: ${err}`))
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

This project uses `yarn` for package management.

## License

MIT
