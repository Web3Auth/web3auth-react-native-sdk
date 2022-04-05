import React, {useState} from 'react';

import {StyleSheet, View, Text, Button} from 'react-native';
import Web3authReactNativeSdk, {
  LoginProvider,
  Web3authNetwork,
} from '@web3auth/react-native-sdk';

export default function App() {
  const [loginResult, setLoginResult] = useState('');

  React.useEffect(() => {
    Web3authReactNativeSdk.init({
      clientId:
        'BKJ3HmEqVmMHbFeW6E-CVPmdnVrnPhdBEI82kxgBVJGtaS4XlylvAE-1gmsv_Fa1CDj-xIhvTf3Kgd6mTn8nJtw',
      network: Web3authNetwork.MAINNET,
      redirectUrl: 'com.example.openloginreactnativesdk://auth',
    })
      .then(result => console.log(`success: ${result}`))
      .catch(err => console.log(`error: ${err}`));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Button
          title="Login with Google"
          onPress={() =>
            Web3authReactNativeSdk.login({
              provider: LoginProvider.GOOGLE,
            })
              .then(result => setLoginResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with Apple"
          onPress={() =>
            Web3authReactNativeSdk.login({
              provider: LoginProvider.APPLE,
            })
              .then(result => setLoginResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with Email"
          onPress={() =>
            Web3authReactNativeSdk.login({
              provider: LoginProvider.EMAIL_PASSWORDLESS,
              relogin: true,
              extraLoginOptions: {
                login_hint: 'michael@tor.us',
              },
            })
              .then(result => setLoginResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with Web3Auth"
          onPress={() =>
            Web3authReactNativeSdk.login({extraLoginOptions: {}})
              .then(result => setLoginResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Logout"
          onPress={() =>
            Web3authReactNativeSdk.logout({})
              .then(result => setLoginResult(''))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <Text style={styles.text}>Result: {loginResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 200,
    height: 40,
    marginTop: 15,
  },
  text: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 20,
    width: '100%',
    backgroundColor: 'white',
  },
});
