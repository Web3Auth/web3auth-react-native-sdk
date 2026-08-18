// Web3Auth setup - must be imported first before any other imports
// Includes URL, crypto, and Buffer polyfills via the SDK setup entry
import "@web3auth/react-native-sdk/setup";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AUTH_CONNECTION,
  useAccessToken,
  useAuthTokenInfo,
  useEnableMFA,
  useManageMFA,
  useRefreshSession,
  useSignatureRequest,
  useWalletUI,
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
  Web3AuthProvider,
} from "@web3auth/react-native-sdk";
import { WagmiProvider } from "@web3auth/react-native-sdk/wagmi";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import { Button, Dimensions, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { formatUnits } from "viem";
import { createStorage, useAccount, useBalance, useDisconnect, useSignMessage } from "wagmi";

import { getWeb3AuthConfig } from "./web3authConfig";

interface HomeScreenProps {
  useAccountAbstraction: boolean;
  onToggleAA: (value: boolean) => void;
}

// IMP START - SDK Initialization
function HomeScreen({ useAccountAbstraction, onToggleAA }: HomeScreenProps) {
  const { isConnected, isAuthorized, accessToken, isInitializing } = useWeb3Auth();
  const { connectTo, loading: connectLoading } = useWeb3AuthConnect();
  const { disconnect: disconnectWeb3Auth } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { showWalletUI } = useWalletUI();
  const { request } = useSignatureRequest();
  const { getAccessToken } = useAccessToken();
  const { getAuthTokenInfo } = useAuthTokenInfo();
  const { refreshSession } = useRefreshSession();
  const { enableMFA } = useEnableMFA();
  const { manageMFA } = useManageMFA();
  const { address, isConnected: isWagmiConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();
  // IMP END - SDK Initialization

  const [email, setEmail] = useState("");
  const [consoleOutput, setConsoleOutput] = useState("");

  const uiConsole = (...args: unknown[]) => setConsoleOutput(JSON.stringify(args, null, 2));

  // IMP START - Login
  const login = async () => {
    if (!email) {
      uiConsole("Please enter your email first");
      return;
    }
    await connectTo({
      authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
      extraLoginOptions: { login_hint: email },
    });
  };
  // IMP END - Login

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!address) {
      uiConsole("wagmi account not connected");
      return;
    }
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!balance) {
      uiConsole("balance unavailable");
      return;
    }
    uiConsole(`${formatUnits(balance.value, balance.decimals)} ${balance.symbol}`);
  };

  const signMessage = async () => {
    uiConsole(await signMessageAsync({ message: "Hello Web3Auth!" }));
  };

  const logout = async () => {
    // Wagmi disconnect awaits Web3Auth logout through the SDK bridge.
    if (isWagmiConnected) {
      await disconnectAsync();
      return;
    }
    await disconnectWeb3Auth();
  };
  // IMP END - Blockchain Calls

  if (isInitializing) {
    return <Text style={styles.status}>Initializing...</Text>;
  }

  if (!isConnected) {
    return (
      // IMP START - Login
      <View style={styles.loginArea}>
        <View style={styles.aaToggleRow}>
          <Text style={{ paddingRight: 6 }}>Use Account Abstraction:</Text>
          <Switch onValueChange={onToggleAA} value={useAccountAbstraction} />
        </View>
        <TextInput style={styles.input} placeholder="Enter your email" onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button title={connectLoading ? "Logging in..." : "Login with Web3Auth"} onPress={login} />
      </View>
      // IMP END - Login
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Get User Info" onPress={() => uiConsole({ userInfo, isAuthorized, accessToken })} />
        <Button title="Get Accounts" onPress={getAccounts} />
        <Button title="Get Balance" onPress={getBalance} />
        <Button title="Sign Message" onPress={signMessage} />
        <Button title="Get Access Token" onPress={() => getAccessToken().then(uiConsole)} />
        <Button title="Get Auth Token Info" onPress={() => getAuthTokenInfo().then(uiConsole)} />
        <Button
          title="Refresh Session"
          onPress={() => refreshSession().then((ok) => uiConsole(ok ? "session refreshed" : "session refresh failed"))}
        />
        <Button title="Show Wallet UI" onPress={() => showWalletUI()} />
        <Button title="Request Signature" onPress={() => request("personal_sign", ["Hello World", "0x"]).then(uiConsole)} />
        <Button title="Enable MFA" onPress={enableMFA} />
        <Button title="Manage MFA" onPress={manageMFA} />
        {/* IMP START - Logout */}
        <Button title="Log Out" onPress={logout} />
        {/* IMP END - Logout */}
      </View>
      <View style={styles.consoleArea}>
        <Text style={styles.consoleLabel}>Console</Text>
        <ScrollView style={styles.console}>
          <Text>{consoleOutput}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const queryClient = new QueryClient();

export default function App() {
  const [useAccountAbstraction, setUseAccountAbstraction] = useState(false);
  const wagmiStorage = useMemo(
    () =>
      createStorage({
        storage: {
          getItem: async (key) => AsyncStorage.getItem(key),
          setItem: async (key, value) => {
            await AsyncStorage.setItem(key, value);
          },
          removeItem: async (key) => {
            await AsyncStorage.removeItem(key);
          },
        },
      }),
    []
  );

  return (
    // IMP START - Setup Web3Auth Provider
    <QueryClientProvider client={queryClient}>
      <Web3AuthProvider
        key={String(useAccountAbstraction)}
        webBrowser={WebBrowser}
        storage={SecureStore}
        config={getWeb3AuthConfig(useAccountAbstraction)}
      >
        <WagmiProvider config={{ storage: wagmiStorage }}>
          <HomeScreen useAccountAbstraction={useAccountAbstraction} onToggleAA={setUseAccountAbstraction} />
        </WagmiProvider>
      </Web3AuthProvider>
    </QueryClientProvider>
    // IMP END - Setup Web3Auth Provider
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: "#fff",
  },
  loginArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  aaToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    height: 44,
    width: 300,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  consoleArea: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  consoleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  console: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 10,
    width: Dimensions.get("window").width - 40,
  },
  status: {
    flex: 1,
    textAlign: "center",
    marginTop: 60,
  },
});
