import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Button, ScrollView, Dimensions, TextInput, Switch } from "react-native";
import "@ethersproject/shims";
import { ethers } from "ethers";

// IMP START - Quick Start
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import EncryptedStorage from "react-native-encrypted-storage";
import Web3Auth, { LOGIN_PROVIDER, WEB3AUTH_NETWORK, ChainNamespace } from "@web3auth/react-native-sdk";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { MMKVLoader, useMMKVStorage } from "react-native-mmkv-storage";
import {
  AccountAbstractionProvider,
  BiconomySmartAccount,
  ISmartAccount,
  KernelSmartAccount,
  SafeSmartAccount,
  TrustSmartAccount,
} from "@web3auth/account-abstraction-provider";
// IMP END - Quick Start

const scheme = "web3authrnexample"; // Or your desired app redirection scheme
// IMP START - Whitelist bundle ID
const redirectUrl = `${scheme}://auth`;
// IMP END - Whitelist bundle ID

// IMP START - Dashboard Registration
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - SDK Initialization
const chainConfig = {
  chainNamespace: ChainNamespace.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  // Avoid using public rpcTarget in production.
  // Use services like Infura, Quicknode etc
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  decimals: 18,
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig,
  },
});

const PIMLICO_API_KEY = "YOUR_PIMLICO_API_KEY";

export const getDefaultBundlerUrl = (chainId: string): string => {
  return `https://api.pimlico.io/v2/${Number(chainId)}/rpc?apikey=${PIMLICO_API_KEY}`;
};

export type SmartAccountType = "safe" | "kernel" | "biconomy" | "trust";

export type AccountAbstractionConfig = {
  bundlerUrl?: string;
  paymasterUrl?: string;
  smartAccountType?: SmartAccountType;
};

const AAConfig: AccountAbstractionConfig = {
  // bundlerUrl: "https://bundler.safe.global",
  // paymasterUrl: "https://paymaster.safe.global",
  smartAccountType: "safe",
};

const storage = new MMKVLoader().initialize();
// IMP END - SDK Initialization

export default function App() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [console, setConsole] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [useAccountAbstraction, setUseAccountAbstraction] = useMMKVStorage<boolean>("useAccountAbstraction", storage, false);

  const toggleAccountAbstraction = () => {
    setUseAccountAbstraction((prevState) => !prevState);
  };

  useEffect(() => {
    const init = async () => {
      // setup aa provider
      let aaProvider: AccountAbstractionProvider | undefined;
      if (useAccountAbstraction) {
        const { bundlerUrl, paymasterUrl, smartAccountType } = AAConfig;

        let smartAccountInit: ISmartAccount;
        switch (smartAccountType) {
          case "biconomy":
            smartAccountInit = new BiconomySmartAccount();
            break;
          case "kernel":
            smartAccountInit = new KernelSmartAccount();
            break;
          case "trust":
            smartAccountInit = new TrustSmartAccount();
            break;
          // case "light":
          //   smartAccountInit = new LightSmartAccount();
          //   break;
          // case "simple":
          //   smartAccountInit = new SimpleSmartAccount();
          //   break;
          case "safe":
          default:
            smartAccountInit = new SafeSmartAccount();
            break;
        }

        aaProvider = new AccountAbstractionProvider({
          config: {
            chainConfig,
            bundlerConfig: {
              url: bundlerUrl ?? getDefaultBundlerUrl(chainConfig.chainId),
            },
            paymasterConfig: paymasterUrl
              ? {
                  url: paymasterUrl,
                }
              : undefined,
            smartAccountInit,
          },
        });
      }

      const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        // IMP START - Whitelist bundle ID
        redirectUrl,
        // IMP END - Whitelist bundle ID
        network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // or other networks
        privateKeyProvider,
        accountAbstractionProvider: aaProvider,
      });
      setWeb3auth(web3auth);

      // IMP START - SDK Initialization
      await web3auth.init();

      if (web3auth.connected) {
        // IMP END - SDK Initialization
        setProvider(web3auth.provider);
        setLoggedIn(true);
      }
    };
    init();
  }, [useAccountAbstraction]);

  const login = async () => {
    try {
      if (!web3auth?.ready) {
        setConsole("Web3auth not initialized");
        return;
      }
      if (!email) {
        setConsole("Enter email first");
        return;
      }

      setConsole("Logging in");
      // IMP START - Login
      await web3auth.login({
        loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
        extraLoginOptions: {
          login_hint: email,
        },
      });
      uiConsole(web3auth.userInfo);

      if (web3auth.connected) {
        // IMP END - Login
        setProvider(web3auth.provider);
        uiConsole("Logged In");
        setLoggedIn(true);
      }
    } catch (e: any) {
      setConsole(e.message);
    }
  };

  const logout = async () => {
    if (!web3auth?.ready) {
      setConsole("Web3auth not initialized");
      return;
    }

    setConsole("Logging out");
    // IMP START - Logout
    await web3auth.logout();
    // IMP END - Logout

    if (!web3auth.connected) {
      setProvider(null);
      uiConsole("Logged out");
      setLoggedIn(false);
    }
  };

  // IMP START - Blockchain Calls
  const getAccounts = async (): Promise<string> => {
    if (!provider) {
      uiConsole("provider not set");
      return "";
    }
    setConsole("Getting account");
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not set");
      return;
    }
    setConsole("Fetching balance");
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();

    // Get user's Ethereum public address
    const address = signer.getAddress();

    // Get user's balance in ether
    // For ethers v5
    // const balance = ethers.utils.formatEther(
    // await ethersProvider.getBalance(address) // Balance is in wei
    // );
    const balance = ethers.formatEther(
      await ethersProvider.getBalance(address) // Balance is in wei
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not set");
      return;
    }
    setConsole("Signing message");
    // For ethers v5
    // const ethersProvider = new ethers.providers.Web3Provider(this.provider);
    const ethersProvider = new ethers.BrowserProvider(provider!);

    // For ethers v5
    // const signer = ethersProvider.getSigner();
    const signer = await ethersProvider.getSigner();
    const originalMessage = "YOUR_MESSAGE";

    // Sign the message
    const signedMessage = await signer.signMessage(originalMessage);
    uiConsole(signedMessage);
  };
  // IMP END - Blockchain Calls

  const launchWalletServices = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }

    setConsole("Launch Wallet Services");
    await web3auth.launchWalletServices(chainConfig);
  };

  const uiConsole = (...args: unknown[]) => {
    setConsole(JSON.stringify(args || {}, null, 2) + "\n\n\n\n" + console);
  };

  const requestSignature = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }
    try {
      const address: string = await getAccounts();

      const params = ["Hello World", address];
      const res = await web3auth.request(chainConfig, "personal_sign", params);
      uiConsole(res);
    } catch (error) {
      uiConsole("Error in requestSignature:", error);
    }
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(web3auth?.userInfo())} />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Show Wallet UI" onPress={() => launchWalletServices()} />
      <Button title="Request Signature UI" onPress={() => requestSignature()} />
      <Button title="Log Out" onPress={logout} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonAreaLogin}>
      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ paddingRight: 6 }}>Use Account Abstraction:</Text>
          <Switch onValueChange={toggleAccountAbstraction} value={useAccountAbstraction} />
        </View>
      </View>
      <TextInput style={styles.inputEmail} placeholder="Enter email" onChangeText={setEmail} />
      <Button title="Login with Web3Auth" onPress={login} />
    </View>
  );

  return (
    <View style={styles.container}>
      {loggedIn ? loggedInView : unloggedInView}
      <View style={styles.consoleArea}>
        <Text style={styles.consoleText}>Console:</Text>
        <ScrollView style={styles.console}>
          <Text>{console}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 30,
  },
  consoleArea: {
    margin: 20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  console: {
    flex: 1,
    backgroundColor: "#CCCCCC",
    color: "#ffffff",
    padding: 10,
    width: Dimensions.get("window").width - 60,
  },
  consoleText: {
    padding: 10,
  },
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 30,
  },
  buttonAreaLogin: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 30,
  },
  inputEmail: {
    height: 40,
    width: 300,
    borderColor: "gray",
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
});
