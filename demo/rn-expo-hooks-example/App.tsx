import '@ethersproject/shims';

import {
  AUTH_CONNECTION,
  useEnableMFA,
  useIdentityToken,
  useManageMFA,
  useSignatureRequest,
  useWalletUI,
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
  Web3AuthProvider,
} from '@web3auth/react-native-sdk';
import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Button, Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import web3AuthContextConfig from './web3authConfig';

// IMP START - SDK Initialization
function HomeScreen() {
  const { isConnected, isInitializing, provider } = useWeb3Auth();
  const { connectTo, loading: connectLoading } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { showWalletUI } = useWalletUI();
  const { request } = useSignatureRequest();
  const { getIdentityToken } = useIdentityToken();
  const { enableMFA } = useEnableMFA();
  const { manageMFA } = useManageMFA();
  // IMP END - SDK Initialization

  const [email, setEmail] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');

  const uiConsole = (...args: unknown[]) => setConsoleOutput(JSON.stringify(args, null, 2));

  // IMP START - Login
  const login = async () => {
    if (!email) {
      uiConsole('Please enter your email first');
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
    const ethersProvider = new ethers.BrowserProvider(provider!);
    const signer = await ethersProvider.getSigner();
    uiConsole(await signer.getAddress());
  };

  const getBalance = async () => {
    const ethersProvider = new ethers.BrowserProvider(provider!);
    const signer = await ethersProvider.getSigner();
    const balance = ethers.formatEther(
      await ethersProvider.getBalance(await signer.getAddress()),
    );
    uiConsole(balance);
  };

  const signMessage = async () => {
    const ethersProvider = new ethers.BrowserProvider(provider!);
    const signer = await ethersProvider.getSigner();
    uiConsole(await signer.signMessage('Hello Web3Auth!'));
  };
  // IMP END - Blockchain Calls

  if (isInitializing) {
    return <Text style={styles.status}>Initializing...</Text>;
  }

  if (!isConnected) {
    return (
      // IMP START - Login
      <View style={styles.loginArea}>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button title={connectLoading ? 'Logging in...' : 'Login with Web3Auth'} onPress={login} />
      </View>
      // IMP END - Login
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
        <Button title="Get Accounts" onPress={getAccounts} />
        <Button title="Get Balance" onPress={getBalance} />
        <Button title="Sign Message" onPress={signMessage} />
        <Button title="Get Identity Token" onPress={() => getIdentityToken().then(uiConsole)} />
        <Button title="Show Wallet UI" onPress={() => showWalletUI()} />
        <Button
          title="Request Signature"
          onPress={() => request('personal_sign', ['Hello World', '0x']).then(uiConsole)}
        />
        <Button title="Enable MFA" onPress={enableMFA} />
        <Button title="Manage MFA" onPress={manageMFA} />
        {/* IMP START - Logout */}
        <Button title="Log Out" onPress={disconnect} />
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

export default function App() {
  return (
    // IMP START - Setup Web3Auth Provider
    <Web3AuthProvider webBrowser={WebBrowser} storage={SecureStore} config={web3AuthContextConfig}>
      <HomeScreen />
    </Web3AuthProvider>
    // IMP END - Setup Web3Auth Provider
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  loginArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  input: {
    height: 44,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  buttonArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  consoleArea: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  consoleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  console: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    width: Dimensions.get('window').width - 40,
  },
  status: {
    flex: 1,
    textAlign: 'center',
    marginTop: 60,
  },
});
