import {
  useAccessToken,
  useEnableMFA,
  useManageMFA,
  useWalletUI,
  useWeb3Auth,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/react-native-sdk";
import { useSignMessage, useSolanaWallet } from "@web3auth/react-native-sdk/solana";
import React, { useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Console } from "./Console";
import { getSolanaBalance } from "../lib/solana";

/**
 * Logged-in screen for Solana.
 *
 * Key difference from EVM examples:
 *   - `connection.solanaWallet` is a wallet-standard `Wallet` (not EIP-1193).
 *   - `useSolanaWallet()` exposes `accounts` and an RPC client for balance reads.
 *   - `useSignMessage()` signs via the Auth Solana wallet.
 *
 * Wallet Services (Wallet UI, MFA, auth tokens) are chain-agnostic.
 */
export function HomeView() {
  const { disconnect } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { showWalletUI } = useWalletUI();
  const { getAccessToken } = useAccessToken();
  const { enableMFA } = useEnableMFA();
  const { manageMFA } = useManageMFA();
  const { accounts, rpc } = useSolanaWallet();
  const { signMessage } = useSignMessage();

  const [output, setOutput] = useState("");
  const log = (...args: unknown[]) => setOutput(JSON.stringify(args, null, 2));

  const solanaAddress = accounts![0]!;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Get User Info" onPress={() => log(userInfo)} />

        {/* IMP START - Blockchain Calls */}
        <Button title="Get Solana Address" onPress={() => log(solanaAddress)} />
        <Button
          title="Get Balance"
          onPress={() => getSolanaBalance(rpc!, solanaAddress).then(log)}
        />
        <Button
          title="Sign Message"
          onPress={() => signMessage("Hello Web3Auth!").then(log)}
        />
        {/* IMP END - Blockchain Calls */}

        <Button title="Get Access Token" onPress={() => getAccessToken().then(log)} />
        <Button title="Show Wallet UI" onPress={() => showWalletUI()} />
        <Button title="Enable MFA" onPress={enableMFA} />
        <Button title="Manage MFA" onPress={manageMFA} />

        {/* IMP START - Logout */}
        <Button title="Log Out" onPress={disconnect} />
        {/* IMP END - Logout */}
      </View>

      <Console output={output} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  buttonArea: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
});
