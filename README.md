# openlogin-react-native-sdk

React Native SDK for Torus OpenLogin

## Installation

```sh
npm install openlogin-react-native-sdk
```

Please refer to the native SDKs for platform-specific configuration.

- [Android SDK](https://github.com/torusresearch/openlogin-android-sdk)
- [iOS SDK](https://github.com/torusresearch/openlogin-swift-sdk)

## Usage

Refer to the demo app for more detailed example.

```js
import OpenloginReactNativeSdk, {
  LoginProvider,
  OpenloginNetwork,
} from 'openlogin-react-native-sdk';

React.useEffect(() => {
  OpenloginReactNativeSdk.addOpenloginAuthStateChangedEventListener(state => {
    console.log(state);
    setAuthState(state);
  });
  OpenloginReactNativeSdk.init({
    // Your clientId obtained from OpenLogin dashboard.
    clientId:
      'BKJ3HmEqVmMHbFeW6E-CVPmdnVrnPhdBEI82kxgBVJGtaS4XlylvAE-1gmsv_Fa1CDj-xIhvTf3Kgd6mTn8nJtw',
    // TESTNET is currently broken on iOS.
    network: OpenloginNetwork.MAINNET,
    // redirectUrl only applies for Android SDK, it is designated by iOS SDK in iOS, which is \(bundleId)://openlogin
    redirectUrl: 'com.example.openloginreactnativesdk://auth',
  })
    .then(result => console.log(`success: ${result}`))
    .catch(err => console.log(`error: ${err}`));
}, []);

// provider only applies for Android
OpenloginReactNativeSdk.login({
  provider: LoginProvider.GOOGLE,
})
  .then(result => console.log(`success: ${result}`))
  .catch(err => console.log(`error: ${err}`))
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
