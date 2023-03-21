import type { OpenloginUserInfo } from "@toruslabs/openlogin";

export interface State {
  privKey?: string;
  coreKitKey?: string;
  ed25519PrivKey?: string;
  coreKitEd25519PrivKey?: string;
  sessionId?: string;
  userInfo?: OpenloginUserInfo;
}
export type SessionData = State & { error?: string; store?: OpenloginUserInfo }
