/**
 * Solana example — demonstrates the built-in Solana wallet in the RN SDK.
 *
 * The SDK derives an ed25519 keypair from the user's key shares and exposes it
 * as a wallet-standard `Wallet` via `connection.solanaWallet`. Wrap the app in
 * `SolanaProvider` from `@web3auth/react-native-sdk/solana` to use the signing hooks.
 *
 * Chain configuration is fetched from the Web3Auth Dashboard at init time.
 * `web3authConfig.ts` only sets client ID, redirect URL, network, and optional `defaultChainId`.
 */
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import { useWeb3Auth, Web3AuthProvider } from "@web3auth/react-native-sdk";
import { SolanaProvider } from "@web3auth/react-native-sdk/solana";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
// Storage for encrypted session data. On Expo, use `expo-secure-store` instead.
import EncryptedStorage from "react-native-encrypted-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HomeView } from "./components/HomeView";
import { LoginView } from "./components/LoginView";
import web3AuthConfig from "./web3authConfig";

// ─── Inner screen (must be a child of Web3AuthProvider) ───────────────────────
// IMP START - SDK Initialization
function Screen() {
  const { isConnected, isInitializing, initError } = useWeb3Auth();
  // IMP END - SDK Initialization

  if (isInitializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.initText}>Initializing…</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to initialize Web3Auth</Text>
        <Text style={styles.errorDetail}>{String(initError)}</Text>
      </View>
    );
  }

  return isConnected ? <HomeView /> : <LoginView />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    // IMP START - Setup Web3Auth Provider
    <Web3AuthProvider webBrowser={WebBrowser} storage={EncryptedStorage} config={web3AuthConfig}>
      <SolanaProvider>
        <SafeAreaProvider>
          <Screen />
        </SafeAreaProvider>
      </SolanaProvider>
    </Web3AuthProvider>
    // IMP END - Setup Web3Auth Provider
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initText: {
    marginTop: 12,
    color: "#666",
  },
  errorText: {
    fontWeight: "600",
    color: "#c00",
    marginBottom: 8,
  },
  errorDetail: {
    color: "#666",
    paddingHorizontal: 24,
    textAlign: "center",
  },
});
