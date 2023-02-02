import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import Web3Auth, { LOGIN_PROVIDER, OPENLOGIN_NETWORK, State } from "@web3auth/react-native-sdk";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from 'expo-secure-store';
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
  const [userInfo, setUserInfo] = useState<State>(null);

  var web3auth = useRef<Web3Auth>();

  useEffect(() => {
    web3auth.current = new Web3Auth(WebBrowser, SecureStore, {
      clientId: "BDj1toq1N1xYgDIJ00ADR-QPJ71ESzJcB3ijVHP1TsIX7nsx_lu6uLoJQMPze1vpGDt--Ew95RGxz-RgOh1tcxM",
      network: OPENLOGIN_NETWORK.TESTNET,
    });
    web3auth.current.init().then(function(state) {
      setKey(state.privKey || "no key");
      setUserInfo(state);
    });
  }, []);

  const login = async () => {
    try {
      const state = await web3auth.current.login({
        loginProvider: LOGIN_PROVIDER.GOOGLE,
        redirectUrl: resolvedRedirectUrl,
      });
      setKey(state.privKey || "no key");
      setUserInfo(state);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };
  return (
    <View style={styles.container}>
      {key !== "" ? <Text>Key: {key}</Text> : null}
      {userInfo !== null ? <Text>UserInfo: {JSON.stringify(userInfo)}</Text> : null}
      {errorMsg !== "" ? <Text>Error: {errorMsg}</Text> : null}
      <Text>Linking URL: {resolvedRedirectUrl}</Text>
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
