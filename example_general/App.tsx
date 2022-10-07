/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useState} from 'react';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import Web3Auth, {
  LOGIN_PROVIDER,
  OPENLOGIN_NETWORK,
  State,
} from '@web3auth/react-native-sdk';

import {Button, StatusBar, StyleSheet, Text, View} from 'react-native';

import {Buffer} from 'buffer';

globalThis.Buffer = globalThis.Buffer || Buffer;
const scheme = 'web3authexposample';
const resolvedRedirectUrl = `${scheme}://auth`;

const App = () => {
  const [key, setKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [userInfo, setUserInfo] = useState<State | null>(null);
  const login = async () => {
    try {
      const web3auth = new Web3Auth(WebBrowser, {
        clientId:
          'BA0mVyeHATikwuXVhXWCNjAxHthlw0w84mUhLuxlC4KZKjvmBsbdbmEWTizJ26YzrbKSWbOZbtGYdVDm0ESuYSg',
        network: OPENLOGIN_NETWORK.TESTNET,
      });
      const state = await web3auth.login({
        loginProvider: LOGIN_PROVIDER.GOOGLE,
        redirectUrl: resolvedRedirectUrl,
      });
      setKey(state.privKey || 'no key');
      setUserInfo(state);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e));
    }
  };
  return (
    <View style={styles.container}>
      {key !== '' ? <Text>Key: {key}</Text> : null}
      {userInfo !== null ? (
        <Text>UserInfo: {JSON.stringify(userInfo)}</Text>
      ) : null}
      {errorMsg !== '' ? <Text>Error: {errorMsg}</Text> : null}
      <Text>Linking URL: {resolvedRedirectUrl}</Text>
      <Button title="Login with Web3Auth" onPress={login} />
      <StatusBar />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
