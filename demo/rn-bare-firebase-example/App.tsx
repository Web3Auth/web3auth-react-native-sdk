import "@ethersproject/shims";

import firebaseAuth from "@react-native-firebase/auth";
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import Web3Auth, { AUTH_CONNECTION, CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";

const scheme = "web3authrnbarefirebase"; // Or your desired app redirection scheme
const redirectUrl = `${scheme}://auth`;
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: `https://api.web3auth.io/infura-service/v1/0xaa36a7/${clientId}`,
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

async function signInWithEmailPassword() {
  try {
    const res = await firebaseAuth().signInAnonymously();
    return res;
  } catch (error) {
    console.error(error);
  }
}

export default function App() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [console, setConsole] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        redirectUrl,
        network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // or other networks
        privateKeyProvider,
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
  }, []);

  const login = async () => {
    try {
      if (!web3auth?.ready) {
        setConsole("Web3auth not initialized");
        return;
      }

      setConsole("Logging in");
      const loginRes = await signInWithEmailPassword();
      uiConsole("Login success", loginRes);
      const idToken = await loginRes?.user.getIdToken(true);
      uiConsole("idToken", idToken);

      // IMP START - Login
      await web3auth.connectTo({
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: "w3a-firebase-demo",
        idToken: idToken,
        extraLoginOptions: {
          verifierIdField: "sub",
          domain: "http://localhost:3000",
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
    await web3auth.launchWalletServices();
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
    <View style={styles.buttonArea}>
      <Button title="Login with Web3Auth" onPress={() => login()} />
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
});
