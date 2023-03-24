import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import EncryptedStorage from 'react-native-encrypted-storage';
import Web3Auth, {
  LOGIN_PROVIDER,
  OPENLOGIN_NETWORK,
  IWeb3Auth,
  OpenloginUserInfo,
} from '@web3auth/react-native-sdk';
import RPC from './ethersRPC'; // for using ethers.js

const scheme = 'web3authrnbareaggregateexample'; // Or your desired app redirection scheme
const resolvedRedirectUrl = `${scheme}://openlogin`;
const clientId =
  'BHr_dKcxC0ecKn_2dZQmQeNdjPgWykMkcodEHkVvPMo71qzOV6SgtoN8KCvFdLN7bf34JOm89vWQMLFmSfIo84A';

export default function App() {
  const [userInfo, setUserInfo] = useState<OpenloginUserInfo | undefined>();
  const [key, setKey] = useState<string | undefined>('');
  const [console, setConsole] = useState<string>('');
  const [web3auth, setWeb3Auth] = useState<IWeb3Auth | null>(null);

  const login = async () => {
    try {
      if (!web3auth) {
        setConsole('Web3auth not initialized');
        return;
      }

      setConsole('Logging in');
      const result = await web3auth.login({
        loginProvider: LOGIN_PROVIDER.GOOGLE,
        redirectUrl: resolvedRedirectUrl,
        mfaLevel: 'default',
        curve: 'secp256k1',
      });

      if (result) {
        setUserInfo(web3auth.userInfo);
        setKey(web3auth.privKey);
        uiConsole('Logged In');
      }
    } catch (e) {
      setConsole(e.message);
    }
  };

  const logout = async () => {
    if (!web3auth) {
      setConsole('Web3auth not initialized');
      return;
    }

    setConsole('Logging out');
    const result = await web3auth.logout();

    if (result) {
      setUserInfo(undefined);
      setKey('');
      uiConsole('Logged out');
    }
  };

  useEffect(() => {
    const init = async () => {
      const auth = new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        network: OPENLOGIN_NETWORK.TESTNET, // or other networks
        useCoreKitKey: false,
        loginConfig: {
          google: {
            verifier: 'w3a-agg-example',
            verifierSubIdentifier: 'w3a-google',
            typeOfLogin: 'google',
            clientId:
              '774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com',
          },
        },
      });

      setWeb3Auth(auth);
      const result = await auth.init();
      if (result) {
        uiConsole('Re logged in');
        setUserInfo(auth.userInfo);
        setKey(auth.privKey);
        window.console.log(auth.privKey);
      }
    };
    init();
  }, []);

  const getChainId = async () => {
    setConsole('Getting chain id');
    const networkDetails = await RPC.getChainId();
    uiConsole(networkDetails);
  };

  const getAccounts = async () => {
    setConsole('Getting account');
    const address = await RPC.getAccounts(key);
    uiConsole(address);
  };
  const getBalance = async () => {
    setConsole('Fetching balance');
    const balance = await RPC.getBalance(key);
    uiConsole(balance);
  };
  const sendTransaction = async () => {
    setConsole('Sending transaction');
    const tx = await RPC.sendTransaction(key);
    uiConsole(tx);
  };
  const signMessage = async () => {
    setConsole('Signing message');
    const message = await RPC.signMessage(key);
    uiConsole(message);
  };

  const uiConsole = (...args) => {
    setConsole(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + console);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Get Chain ID" onPress={() => getChainId()} />
      <Button title="Get Accounts" onPress={() => getAccounts()} />
      <Button title="Get Balance" onPress={() => getBalance()} />
      <Button title="Send Transaction" onPress={() => sendTransaction()} />
      <Button title="Sign Message" onPress={() => signMessage()} />
      <Button title="Get Private Key" onPress={() => uiConsole(key)} />
      <Button title="Log Out" onPress={logout} />
    </View>
  );

  const unloggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Login with Web3Auth" onPress={login} />
    </View>
  );

  return (
    <View style={styles.container}>
      {key ? loggedInView : unloggedInView}
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  consoleArea: {
    margin: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  console: {
    flex: 1,
    backgroundColor: '#CCCCCC',
    color: '#ffffff',
    padding: 10,
    width: Dimensions.get('window').width - 60,
  },
  consoleText: {
    padding: 10,
  },
  buttonArea: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 30,
  },
});
