import "@ethersproject/shims";

// IMP START - Quick Start
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import Web3Auth, { AUTH_CONNECTION, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import { ethers, Wallet } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Dimensions, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";
import { MMKVLoader, useMMKVStorage } from "react-native-mmkv-storage";
// IMP END - Quick Start

const scheme = "web3authrnexample"; // Or your desired app redirection scheme
// IMP START - Whitelist bundle ID
const redirectUrl = `${scheme}://auth`;
// IMP END - Whitelist bundle ID

// IMP START - Dashboard Registration
const clientId = "BCfIbiMcEwBkmyNxwn-DcYIfUU4QrpQgyOZZTNi5f_ygWMS1g_dNcuxylwDkIbVNhDtn7dAs-aMUhX0dtAYhvWk"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

const PIMLICO_API_KEY = "pim_WDBELWbZeo9guUAr7HNFaF";

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
  const [signer, setSigner] = useState<Wallet | null>(null);
  const [console, setConsole] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [useAccountAbstraction, setUseAccountAbstraction] = useMMKVStorage<boolean>("useAccountAbstraction", storage, false);

  const toggleAccountAbstraction = () => {
    setUseAccountAbstraction((prevState) => !prevState);
  };

  useEffect(() => {
    const init = async () => {
      const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        // IMP START - Whitelist bundle ID
        redirectUrl,
        // IMP END - Whitelist bundle ID
        network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // or other networks
        accountAbstractionConfig: useAccountAbstraction ? AAConfig : undefined,
      });
      setWeb3auth(web3auth);

      // IMP START - SDK Initialization
      await web3auth.init();

      if (web3auth.connected) {
        // IMP END - SDK Initialization
        setSigner(web3auth.signer as Wallet);
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
      await web3auth.connectTo({
        authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
        extraLoginOptions: {
          login_hint: email,
        },
      });
      uiConsole(web3auth.userInfo);

      if (web3auth.connected) {
        // IMP END - Login
        setSigner(web3auth.signer as Wallet);
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
      setSigner(null);
      uiConsole("Logged out");
      setLoggedIn(false);
    }
  };

  // IMP START - Blockchain Calls
  const getAccounts = async (): Promise<string> => {
    if (!signer) {
      uiConsole("signer not set");
      return "";
    }
    setConsole("Getting account");

    // Get user's Ethereum public address
    const address = signer.getAddress();
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!signer) {
      uiConsole("signer not set");
      return;
    }
    setConsole("Fetching balance");

    // Get user's Ethereum public address
    const address = signer.getAddress();

    // Get user's balance in ether
    // For ethers v5
    // const balance = ethers.utils.formatEther(
    // await ethersProvider.getBalance(address) // Balance is in wei
    // );
    const balance = ethers.formatEther(
      (await signer.provider?.getBalance(address))?.toString() ?? "0" // Balance is in wei
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    if (!signer) {
      uiConsole("signer not set");
      return;
    }
    setConsole("Signing message");
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
      const res = await web3auth.request("personal_sign", params);
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
