export interface StoreApiResponse {
  message?: string;
}

export interface LogoutApiRequest {
  key?: string;
  data?: string;
  signature?: string;
  timeout: number;
}

export interface ShareMetadata {
  iv: string;
  ephemPublicKey: string;
  ciphertext: string;
  mac: string;
}
