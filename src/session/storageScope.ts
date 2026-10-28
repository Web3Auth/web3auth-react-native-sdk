import { keccak256 } from "@toruslabs/metadata-helpers";
import URI from "urijs";

export const SESSION_STORAGE_KEYS = {
  CLIENT_ID: "session_web3auth_client_id",
  IS_SFA: "sfa_storage_is_sfa",
  SFA_SESSION_ID: "sfa_session_id",
} as const;

type StorageNamespaceParams = {
  redirectUrl: string;
  clientId: string;
  network: string;
  buildEnv: string;
  sessionScope: string;
};

/**
 * Builds a stable native-storage namespace from the registered application
 * redirect and all immutable project/session configuration.
 */
export const deriveStorageNamespace = ({ redirectUrl, clientId, network, buildEnv, sessionScope }: StorageNamespaceParams): string => {
  const applicationIdentity = new URI(redirectUrl).query("").hash("").normalize().toString();
  const namespaceInput = JSON.stringify(["web3auth-react-native", 1, applicationIdentity, clientId, network, buildEnv, sessionScope]);
  return `web3auth_${keccak256(Buffer.from(namespaceInput, "utf8")).replace(/^0x/, "")}`;
};

export type ProjectBoundSessionData = {
  web3AuthClientId?: string;
};

export const isStoredClientIdValid = (storedClientId: string | null, requestedClientId: string): boolean => storedClientId === requestedClientId;

export const hasSessionClientIdMismatch = (sessionData: ProjectBoundSessionData | null, requestedClientId: string): boolean =>
  Boolean(sessionData?.web3AuthClientId && sessionData.web3AuthClientId !== requestedClientId);
