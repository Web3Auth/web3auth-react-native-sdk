import {
  LOGIN_PROVIDER,
  LOGIN_PROVIDER_TYPE,
  MFA_LEVELS,
  MfaLevelType,
  OPENLOGIN_NETWORK,
  OPENLOGIN_NETWORK_TYPE,
  OpenloginUserInfo,
} from "./types/core";
import { LoginConfig, TypeOfLogin, WhiteLabelData } from "./types/jrpc";
import { SdkInitParams, SdkLoginParams, SdkLogoutParams } from "./types/sdk";
import { State } from "./types/State";
import { ExtraLoginOptions } from "./types/utils";
import Web3Auth from "./Web3Auth";

export type {
  ExtraLoginOptions,
  LOGIN_PROVIDER_TYPE,
  LoginConfig,
  MfaLevelType,
  OPENLOGIN_NETWORK_TYPE,
  OpenloginUserInfo,
  SdkInitParams,
  SdkLoginParams,
  SdkLogoutParams,
  TypeOfLogin,
  State as Web3AuthState,
  WhiteLabelData,
};

export { LOGIN_PROVIDER, MFA_LEVELS, OPENLOGIN_NETWORK };

export default Web3Auth;
