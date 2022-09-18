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
    "scheme": "web3authreactnativesdkexample"
  }
}
```

### Bare workflow Configuration

When using our SDK with a bare workflow React Native app, you have to install a `WebBrowser` implementation made by us.

```bash npm2yarn
npm install --save @toruslabs/react-native-web-browser
```

#### Android

- Perform the native [Android integration steps](https://web3auth.io/docs/sdk/android/).
- For Android, the `redirectUrl` parameter is configurable, and has to be added into the `AndroidManifest.xml`.

#### iOS

- Perform the native [iOS integration steps](https://web3auth.io/docs/sdk/ios/).

- You may add the `redirectUrl` to your iOS `Info.plist`, but it is not required.

#### Register the URL scheme you intended to use for redirection

- Android `AndoidManifest.xml` (required)
- iOS `Info.plist` (optional)


## 💥 Initialization & Usage

In your sign-in activity', create an `Web3Auth` instance with your Web3Auth project's configurations and 
configure it like this:

```kotlin
class MainActivity : AppCompatActivity() {
    // ...
    private lateinit var web3Auth: Web3Auth

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        web3Auth = Web3Auth(
            Web3AuthOptions(context = this,
                clientId = getString(R.string.web3auth_project_id),
                network = Web3Auth.Network.MAINNET,
                redirectUrl = Uri.parse("{YOUR_APP_PACKAGE_NAME}://auth"),
                whiteLabel = WhiteLabelData(  // Optional param
                    "Web3Auth Sample App", null, null, "en", true,
                    hashMapOf(
                        "primary" to "#123456"
                    )
                )
            )
        )

        // Handle user signing in when app is not alive
        web3Auth.setResultUrl(intent?.data)
        
        // ...
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)

        // Handle user signing in when app is active
        web3Auth.setResultUrl(intent?.data)

        // ...
    }

    private fun onClickLogin() {
        val selectedLoginProvider = Provider.GOOGLE   // Can be Google, Facebook, Twitch etc
        val loginCompletableFuture: CompletableFuture<Web3AuthResponse> = web3Auth.login(LoginParams(selectedLoginProvider))
        
        loginCompletableFuture.whenComplete { loginResponse, error ->
            if (error == null) {
                // render logged in UI
            } else {
                // render login error UI
            }

        }
    }
    
    //...
}
```

## 🩹 Examples

Checkout the examples for your preferred blockchain and platform in our [examples repository](https://github.com/Web3Auth/examples/)

## 🌐 Demo

Checkout the [Web3Auth Demo](https://demo-app.web3auth.io/) to see how Web3Auth can be used in an application.

Further checkout the [example folder](https://github.com/Web3Auth/web3auth-react-native-sdk/tree/master/example) within this repository, which contains a sample app.

## 💬 Troubleshooting and Discussions

- Have a look at our [GitHub Discussions](https://github.com/Web3Auth/Web3Auth/discussions?discussions_q=sort%3Atop) to see if anyone has any questions or issues you might be having.
- Checkout our [Troubleshooting Documentation Page](https://web3auth.io/docs/troubleshooting) to know the common issues and solutions
- Join our [Discord](https://discord.gg/web3auth) to join our community and get private integration support or help with your integration.
