import * as WebBrowser from '@toruslabs/react-native-web-browser';

import {
  Button,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Web3Auth, {
  IWeb3Auth,
  LOGIN_PROVIDER,
  OpenloginUserInfo,
} from '@web3auth/react-native-sdk';
import { useEffect, useState } from 'react';

import { ChainNamespace } from '@web3auth/react-native-sdk';
import EncryptedStorage from 'react-native-encrypted-storage';
import RPC from './ethersRPC'; // for using ethers.js

const scheme = 'web3authrnbareexample'; // Or your desired app redirection scheme
const resolvedRedirectUrl = `${scheme}://openlogin`;
const clientId =
  'BFuUqebV5I8Pz5F7a5A2ihW7YVmbv_OHXnHYDv6OltAD5NGr6e-ViNvde3U4BHdn6HvwfkgobhVu4VwC-OSJkik';

const chainConfig = {
  chainNamespace: ChainNamespace.EIP155,
  chainId: '0xaa36a7',
  rpcTarget: 'https://rpc.ankr.com/eth_sepolia',
  // Avoid using public rpcTarget in production.
  // Use services like Infura, Quicknode etc
  displayName: 'Ethereum Sepolia Testnet',
  blockExplorerUrl: 'https://sepolia.etherscan.io',
  ticker: 'ETH',
  tickerName: 'Ethereum',
  decimals: 18,
  logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
};

export default function App() {
  const [userInfo, setUserInfo] = useState<OpenloginUserInfo | undefined>();
  const [key, setKey] = useState<string | undefined>('');
  const [console, setConsole] = useState<string>('');
  const [web3auth, setWeb3Auth] = useState<IWeb3Auth | null>(null);
  const [email, setEmail] = useState('hello@tor.us');

  const login = async () => {
    try {
      if (!web3auth) {
        setConsole('Web3auth not initialized');
        return;
      }

      setConsole('Logging in');
      await web3auth.login({
        loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS,
        extraLoginOptions: {
          login_hint: email,
        },
      });
      setConsole(`Logged in ${web3auth.privKey}`);
      if (web3auth.privKey) {
        setUserInfo(web3auth.userInfo());
        setKey(web3auth.privKey);
        uiConsole('Logged In');
      }
    } catch (e: unknown) {
      setConsole((e as Error).message);
    }
  };

  const logout = async () => {
    if (!web3auth) {
      setConsole('Web3auth not initialized');
      return;
    }

    setConsole('Logging out');
    await web3auth.logout();

    if (!web3auth.privKey) {
      setUserInfo(undefined);
      setKey('');
      uiConsole('Logged out');
    }
  };

  const enableMFA = async () => {
    if (!web3auth) {
      setConsole('Web3auth not initialized');
      return;
    }

    setConsole('Enable MFA');
    await web3auth.enableMFA();
    uiConsole('MFA enabled');
  };

  const launchWalletSerices = async () => {
    if (!web3auth) {
      setConsole('Web3auth not initialized');
      return;
    }

    setConsole('Launch Wallet Services');
    await web3auth.launchWalletServices(chainConfig);
  };

  const requestSignature = async () => {
    if (!web3auth) {
      setConsole('Web3auth not initialized');
      return;
    }
    if (!key) {
      setConsole('User not logged in');
      return;
    }

    const address = await RPC.getAccounts(key);

    // const params = [
    //   {
    //     challenge: 'Hello World',
    //     address,
    //   },
    //   null,
    // ];
    const params = ['Hello World', address];
    // const params = [{ }];
    // params.push('Hello World');
    // params.push(address);

    // const params = [
    //   address,
    //   {
    //     types: {
    //       EIP712Domain: [
    //         {
    //           name: 'name',
    //           type: 'string',
    //         },
    //         {
    //           name: 'version',
    //           type: 'string',
    //         },
    //         {
    //           name: 'chainId',
    //           type: 'uint256',
    //         },
    //         {
    //           name: 'verifyingContract',
    //           type: 'address',
    //         },
    //       ],
    //       Person: [
    //         {
    //           name: 'name',
    //           type: 'string',
    //         },
    //         {
    //           name: 'wallet',
    //           type: 'address',
    //         },
    //       ],
    //       Mail: [
    //         {
    //           name: 'from',
    //           type: 'Person',
    //         },
    //         {
    //           name: 'to',
    //           type: 'Person',
    //         },
    //         {
    //           name: 'contents',
    //           type: 'string',
    //         },
    //       ],
    //     },
    //     primaryType: 'Mail',
    //     domain: {
    //       name: 'Ether Mail',
    //       version: '1',
    //       chainId: chainConfig.chainId,
    //       verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    //     },
    //     message: {
    //       from: {
    //         name: 'Cow',
    //         wallet: address,
    //       },
    //       to: {
    //         name: 'Bob',
    //         wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    //       },
    //       contents: 'Hello, Bob!',
    //     },
    //   },
    // ];

    setConsole('Request Signature');
    const res = await web3auth.request(chainConfig, 'personal_sign', params);
    uiConsole(res);
  };

  useEffect(() => {
    const init = async () => {
      const auth = new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        network: 'sapphire_devnet', // or other networks
        useCoreKitKey: false,
        loginConfig: {},
        enableLogging: true,
        buildEnv: 'testing',
        redirectUrl: resolvedRedirectUrl,
      });
      setWeb3Auth(auth);
      await auth.init();
      if (auth?.privKey) {
        uiConsole('Re logged in');
        setUserInfo(auth.userInfo());
        setKey(auth.privKey);
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
    if (!key) {
      setConsole('User not logged in');
      return;
    }
    setConsole('Getting account');
    const address = await RPC.getAccounts(key);
    uiConsole(address);
  };
  const getBalance = async () => {
    if (!key) {
      setConsole('User not logged in');
      return;
    }
    setConsole('Fetching balance');
    const balance = await RPC.getBalance(key);
    uiConsole(balance);
  };
  const sendTransaction = async () => {
    if (!key) {
      setConsole('User not logged in');
      return;
    }
    setConsole('Sending transaction');
    const tx = await RPC.sendTransaction(key);
    uiConsole(tx);
  };
  const signMessage = async () => {
    if (!key) {
      setConsole('User not logged in');
      return;
    }
    setConsole('Signing message');
    const message = await RPC.signMessage(key);
    uiConsole(message);
  };

  const uiConsole = (...args: unknown[]) => {
    setConsole(JSON.stringify(args || {}, null, 2) + '\n\n\n\n' + console);
  };

  const loggedInView = (
    <View style={styles.buttonArea}>
      <Button title="Get User Info" onPress={() => uiConsole(userInfo)} />
      <Button title="Enable MFA" onPress={() => enableMFA()} />
      <Button
        title="launch Wallet Services"
        onPress={() => launchWalletSerices()}
      />
      <Button
        title="Request Signature from Wallet Services"
        onPress={() => requestSignature()}
      />
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
      <TextInput
        editable
        onChangeText={text => setEmail(text)}
        value={email}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ padding: 10 }}
      />
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
