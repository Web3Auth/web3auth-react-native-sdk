import { AUTH_CONNECTION, useWeb3AuthConnect } from "@web3auth/react-native-sdk";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Login screen for the Solana example.
 * Uses email OTP — the same pattern works for Google or any other connection.
 */
export function LoginView() {
  const { connectTo, loading, error } = useWeb3AuthConnect();
  const [email, setEmail] = useState("");

  const login = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Email required", "Enter your email before logging in.");
      return;
    }

    // IMP START - Login
    const connection = await connectTo({
      authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
      extraLoginOptions: { login_hint: trimmedEmail },
    });
    if (!connection) {
      Alert.alert("Login error", error ? String(error) : "Web3Auth did not return a connection.");
    }
    // IMP END - Login
  };

  return (
    <SafeAreaView style={styles.loginArea}>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <Button title={loading ? "Logging in…" : "Login with Email OTP"} onPress={login} disabled={loading} />
      {error ? <Text style={styles.error}>{String(error)}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  input: {
    height: 44,
    width: 300,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  error: {
    color: "#c00",
    width: 300,
    textAlign: "center",
  },
});
