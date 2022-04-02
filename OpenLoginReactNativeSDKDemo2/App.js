import React, {useState} from 'react';

import {StyleSheet, View, Text, Button} from 'react-native';
import OpenloginReactNativeSdk, {
  LoginResponse,
  LoginProvider,
  OpenloginNetwork,
} from 'openlogin-react-native-sdk';

export default function App() {
  const [result, setResult] = useState('');

  React.useEffect(() => {
    OpenloginReactNativeSdk.init({
      clientId:
        'BKJ3HmEqVmMHbFeW6E-CVPmdnVrnPhdBEI82kxgBVJGtaS4XlylvAE-1gmsv_Fa1CDj-xIhvTf3Kgd6mTn8nJtw',
      network: OpenloginNetwork.MAINNET,
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
            OpenloginReactNativeSdk.login({
              provider: LoginProvider.GOOGLE,
            })
              .then(result => setResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with Apple"
          onPress={() =>
            OpenloginReactNativeSdk.login({
              provider: LoginProvider.APPLE,
            })
              .then(result => setResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with Apple"
          onPress={() =>
            OpenloginReactNativeSdk.login({
              provider: LoginProvider.EMAIL_PASSWORDLESS,
              relogin: true,
              extraLoginOptions: {
                login_hint: 'michael@tor.us',
              },
            })
              .then(result => setResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Login with OpenLogin"
          onPress={() =>
            OpenloginReactNativeSdk.login({})
              .then(result => setResult(JSON.stringify(result)))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <View style={styles.box}>
        <Button
          title="Logout"
          onPress={() =>
            OpenloginReactNativeSdk.logout({
              provider: LoginProvider.GOOGLE,
            })
              .then(result => setResult(''))
              .catch(err => console.log(`error: ${err}`))
          }
        />
      </View>
      <Text style={styles.text}>Result: {result}</Text>
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
