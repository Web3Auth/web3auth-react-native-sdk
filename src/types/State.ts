import { OpenloginUserInfo } from "./core";

interface State {
  privKey?: string;
  ed25519PrivKey?: string;
  userInfo?: OpenloginUserInfo;
}

export type { State };
