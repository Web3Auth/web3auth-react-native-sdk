import {
  LOGIN_PROVIDER,
  LOGIN_PROVIDER_TYPE,
  MfaLevelType,
  MFA_LEVELS,
  OpenloginUserInfo,
  OPENLOGIN_NETWORK,
  OPENLOGIN_NETWORK_TYPE,
} from "./types/core";
import { LoginConfig, TypeOfLogin, WhiteLabelData } from "./types/jrpc";
import { SdkInitParams, SdkLoginParams, SdkLogoutParams } from "./types/sdk";
import { State } from "./types/State";
import { ExtraLoginOptions } from "./types/utils";
import Web3Auth from "./Web3Auth";

export type {
  LoginConfig,
  WhiteLabelData,
  LOGIN_PROVIDER_TYPE,
  OPENLOGIN_NETWORK_TYPE,
  MfaLevelType,
  ExtraLoginOptions,
  OpenloginUserInfo,
  TypeOfLogin,
  SdkInitParams,
  SdkLoginParams,
  SdkLogoutParams,
  State as Web3AuthState,
};

export { MFA_LEVELS, LOGIN_PROVIDER, OPENLOGIN_NETWORK };

export default Web3Auth;
