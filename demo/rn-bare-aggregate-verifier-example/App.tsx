// IMP START - Quick Start
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import Web3Auth, { AUTH_CONNECTION, type Connection, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import React, { useEffect, useState } from "react";
import { Button, Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";
import { createPublicClient, createWalletClient, custom, formatEther } from "viem";
// IMP END - Quick Start

const scheme = "web3authrnbareaggregateexample"; // Or your desired app redirection scheme
// IMP START - Whitelist bundle ID
const redirectUrl = `${scheme}://auth`;
// IMP END - Whitelist bundle ID

// IMP START - Dashboard Registration
const clientId = "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw";
// IMP END - Dashboard Registration

export default function App() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [console, setConsole] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        // EncryptedStorage.clear();
        const web3auth = new Web3Auth(WebBrowser, EncryptedStorage, {
          clientId,
          // IMP START - Whitelist bundle ID
          redirectUrl,
          // IMP END - Whitelist bundle ID
          network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // or other networks
          enableLogging: true, // Enable debug logging
        });
        setWeb3auth(web3auth);

        // IMP START - SDK Initialization
        await web3auth.init();

        if (web3auth.connected) {
          // IMP END - SDK Initialization
          setConnection(web3auth.connection);
          setLoggedIn(true);
        }
      } catch (error: any) {
        setConsole(`Init error: ${error.message}`);
      }
    };
    init();
  }, []);

  const loginWithGoogle = async () => {
    try {
      if (!web3auth?.ready) {
        setConsole("Web3auth not initialized");
        return;
      }

      setConsole("Logging in with Google");
      await web3auth.connectTo({
        authConnection: AUTH_CONNECTION.GOOGLE,
        authConnectionId: "w3a-google",
        groupedAuthConnectionId: "aggregate-sapphire",
      });

      if (web3auth.connected) {
        setConnection(web3auth.connection);
        uiConsole("Logged In");
        setLoggedIn(true);
      }
    } catch (e: any) {
      setConsole(e.message);
    }
  };

  const loginWithAuth0EmailPasswordless = async () => {
    try {
      if (!web3auth?.ready) {
        setConsole("Web3auth not initialized");
        return;
      }

      setConsole("Logging in with Auth0 Email Passwordless");
      await web3auth.connectTo({
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: "w3a-a0-email-passwordless",
        groupedAuthConnectionId: "aggregate-sapphire",
      });

      if (web3auth.connected) {
        setConnection(web3auth.connection);
        uiConsole("Logged In");
        setLoggedIn(true);
      }
    } catch (e: any) {
      setConsole(e.message);
    }
  };

  const loginWithAuth0GitHub = async () => {
    try {
      if (!web3auth?.ready) {
        setConsole("Web3auth not initialized");
        return;
      }

      setConsole("Logging in with Auth0 GitHub");
      await web3auth.connectTo({
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: "w3a-a0-github",
        groupedAuthConnectionId: "aggregate-sapphire",
      });

      if (web3auth.connected) {
        setConnection(web3auth.connection);
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
    await web3auth.logout();

    if (!web3auth.connected) {
      setConnection(null);
      uiConsole("Logged out");
      setLoggedIn(false);
    }
  };

  // IMP START - Blockchain Calls
  const getAccounts = async (): Promise<string> => {
    const provider = connection?.ethereumProvider;
    if (!provider) {
      uiConsole("provider not set");
      return "";
    }
    setConsole("Getting account");
    const walletClient = createWalletClient({ transport: custom(provider) });
    const [address] = await walletClient.getAddresses();
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    const provider = connection?.ethereumProvider;
    if (!provider) {
      uiConsole("provider not set");
      return;
    }
    setConsole("Fetching balance");
    const publicClient = createPublicClient({ transport: custom(provider) });
    const walletClient = createWalletClient({ transport: custom(provider) });
    const [address] = await walletClient.getAddresses();
    const balance = formatEther(await publicClient.getBalance({ address }));
    uiConsole(balance);
  };

  const signMessage = async () => {
    const provider = connection?.ethereumProvider;
    if (!provider) {
      uiConsole("provider not set");
      return;
    }
    setConsole("Signing message");
    const walletClient = createWalletClient({ transport: custom(provider) });
    const [account] = await walletClient.getAddresses();
    const signedMessage = await walletClient.signMessage({
      account,
      message: "YOUR_MESSAGE",
    });
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

  const uiConsole = (...args: unknown[]) => {
    setConsole((prev) => `${JSON.stringify(args || {}, null, 2)}\n\n\n\n${prev}`);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(web3auth?.userInfo())} />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Show Wallet UI" onPress={() => launchWalletServices()} />
      <Button title="Request Signature UI" onPress={() => requestSignature()} />
      <Button title="Log Out" onPress={() => logout()} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Login with Google" onPress={() => loginWithGoogle()} />
      <Button title="Login with Auth0 Email Passwordless" onPress={() => loginWithAuth0EmailPasswordless()} />
      <Button title="Login with Auth0 GitHub" onPress={() => loginWithAuth0GitHub()} />
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
