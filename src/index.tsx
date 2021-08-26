import { NativeModules } from 'react-native';

type OpenloginReactNativeSdkType = {
  multiply(a: number, b: number): Promise<number>;
};

const { OpenloginReactNativeSdk } = NativeModules;

export default OpenloginReactNativeSdk as OpenloginReactNativeSdkType;
