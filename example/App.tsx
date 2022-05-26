import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import Web3Auth, { LOGIN_PROVIDER, OPENLOGIN_NETWORK } from "@web3auth/react-native-sdk";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Buffer } from "buffer";

global.Buffer = global.Buffer || Buffer;

const scheme = "web3authexposample";

const resolvedRedirectUrl =
  Constants.appOwnership == AppOwnership.Expo || Constants.appOwnership == AppOwnership.Guest
    ? Linking.createURL("web3auth", {})
    : Linking.createURL("web3auth", { scheme: scheme });

export default function App() {
  const [key, setKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const login = async () => {
    try {
      const web3auth = new Web3Auth(WebBrowser, {
        clientId: "BA0mVyeHATikwuXVhXWCNjAxHthlw0w84mUhLuxlC4KZKjvmBsbdbmEWTizJ26YzrbKSWbOZbtGYdVDm0ESuYSg",
        network: OPENLOGIN_NETWORK.TESTNET,
      });
      const state = await web3auth.login({
        loginProvider: LOGIN_PROVIDER.GOOGLE,
        redirectUrl: resolvedRedirectUrl,
      });
      setKey(state.privKey || "no key");
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };
  return (
    <View style={styles.container}>
      <Text>Key: {key}</Text>
      <Text>Error: {errorMsg}</Text>
      <Text>Linking URL: {resolvedRedirectUrl}</Text>
      <Text>appOwnership: {Constants.appOwnership}</Text>
      <Text>executionEnvironment: {Constants.executionEnvironment}</Text>
      <Button title="Login with Web3Auth" onPress={login} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
