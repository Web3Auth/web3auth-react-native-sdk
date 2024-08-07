import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

import { Button, Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Constants, { AppOwnership } from "expo-constants";
import { useEffect, useState } from "react";
import Web3Auth, { ChainNamespace, LOGIN_PROVIDER, OpenloginUserInfo } from "@web3auth/react-native-sdk";

import RPC from "../ethersRPC"; // for using ethers.js

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

const resolvedRedirectUrl =
  Constants.appOwnership == AppOwnership.Expo
    ? Linking.createURL("web3auth", {})
    : Linking.createURL("web3auth", { scheme: "com.anonymous.rnexpoexample" });

const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

export default function App() {
  const [key, setKey] = useState("");
  const [userInfo, setUserInfo] = useState({});
  const [console, setConsole] = useState("");
  const [web3auth, setWeb3Auth] = useState<Web3Auth | null>(null);
  const [email, setEmail] = useState("hello@tor.us");

  useEffect(() => {
    const init = async () => {
      try {
        const auth = new Web3Auth(WebBrowser, SecureStore, {
          clientId,
          network: "sapphire_mainnet", // or other networks
          redirectUrl: resolvedRedirectUrl,
          enableLogging: true,
          buildEnv: "testing",
        });
        setWeb3Auth(auth);
        await auth.init();
        if (auth?.privKey) {
          uiConsole("Re logged in");
          setUserInfo(auth.userInfo() as OpenloginUserInfo);
          setKey(auth.privKey);
        }
      } catch (e) {
        throw e;
      }
    };
    init();
  }, []);

  const login = async () => {
    try {
      setConsole("Logging in");
      await web3auth?.login({
        loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
        redirectUrl: resolvedRedirectUrl,
        extraLoginOptions: {
          login_hint: email,
        },
      });

      if (web3auth?.privKey) {
        setUserInfo(web3auth?.userInfo() as OpenloginUserInfo);
        setKey(web3auth.privKey);
        uiConsole("Logged In");
      }
    } catch (e) {
      uiConsole(e);
      throw e;
    }
  };

  const enableMFA = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }

    setConsole("Enable MFA");
    await web3auth.enableMFA();
    uiConsole("MFA enabled");
  };

  const launchWalletSerices = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }

    setConsole("Launch Wallet Services");
    await web3auth.launchWalletServices(chainConfig);
  };

  const logout = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }

    setConsole("Logging out");
    await web3auth.logout();

    if (!web3auth.privKey) {
      setUserInfo({});
      setKey("");
      uiConsole("Logged out");
    }
  };

  const getChainId = async () => {
    setConsole("Getting chain id");
    const networkDetails = await RPC.getChainId();
    uiConsole(networkDetails);
  };

  const getAccounts = async () => {
    setConsole("Getting account");
    const address = await RPC.getAccounts(key);
    uiConsole(address);
  };
  const getBalance = async () => {
    setConsole("Fetching balance");
    const balance = await RPC.getBalance(key);
    uiConsole(balance);
  };
  const sendTransaction = async () => {
    setConsole("Sending transaction");
    const tx = await RPC.sendTransaction(key);
    uiConsole(tx);
  };
  const signMessage = async () => {
    setConsole("Signing message");
    const message = await RPC.signMessage(key);
    uiConsole(message);
  };

  const requestSignature = async () => {
    if (!web3auth) {
      setConsole("Web3auth not initialized");
      return;
    }
    if (!key) {
      setConsole("User not logged in");
      return;
    }

    const address = await RPC.getAccounts(key);

    // const params = [
    //   {
    //     challenge: 'Hello World',
    //     address,
    //   },
    //   null,
    // ];
    const params = ["Hello World", address];
    // const params = [{ }];
    // params.push('Hello World');
    // params.push(address);

    // const params = [
    //   address,
    //   {
    //     types: {
    //       EIP712Domain: [
    //         {
    //           name: 'name',
    //           type: 'string',
    //         },
    //         {
    //           name: 'version',
    //           type: 'string',
    //         },
    //         {
    //           name: 'chainId',
    //           type: 'uint256',
    //         },
    //         {
    //           name: 'verifyingContract',
    //           type: 'address',
    //         },
    //       ],
    //       Person: [
    //         {
    //           name: 'name',
    //           type: 'string',
    //         },
    //         {
    //           name: 'wallet',
    //           type: 'address',
    //         },
    //       ],
    //       Mail: [
    //         {
    //           name: 'from',
    //           type: 'Person',
    //         },
    //         {
    //           name: 'to',
    //           type: 'Person',
    //         },
    //         {
    //           name: 'contents',
    //           type: 'string',
    //         },
    //       ],
    //     },
    //     primaryType: 'Mail',
    //     domain: {
    //       name: 'Ether Mail',
    //       version: '1',
    //       chainId: chainConfig.chainId,
    //       verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    //     },
    //     message: {
    //       from: {
    //         name: 'Cow',
    //         wallet: address,
    //       },
    //       to: {
    //         name: 'Bob',
    //         wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    //       },
    //       contents: 'Hello, Bob!',
    //     },
    //   },
    // ];

    setConsole("Request Signature");
    const res = await web3auth.request(chainConfig, "personal_sign", params);
    uiConsole(res);
  };

  const uiConsole = (...args: unknown[]) => {
    setConsole(`${JSON.stringify(args || {}, null, 2)}\n\n\n\n${console}`);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Enable MFA" onPress={() => enableMFA()} />
      <Button title="launch Wallet Services" onPress={() => launchWalletSerices()} />
      <Button title="Request Signature" onPress={() => requestSignature()} />
      <Button title="Get Chain ID" onPress={getChainId} />
      <Button title="Get Accounts" onPress={getAccounts} />
      <Button title="Get Balance" onPress={getBalance} />
      <Button title="Send Transaction" onPress={sendTransaction} />
      <Button title="Sign Message" onPress={signMessage} />
      <Button title="Get Private Key" onPress={() => uiConsole(key)} />
      <Button title="Log Out" onPress={logout} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <TextInput
        editable
        onChangeText={(text) => setEmail(text)}
        value={email}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ padding: 10 }}
      />
      <Button title="Login with Web3Auth" onPress={login} />
    </View>
  );

  return (
    <View style={styles.container}>
      {key ? loggedInView : unloggedInView}
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
