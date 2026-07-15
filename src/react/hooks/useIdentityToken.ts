import { IUseAuthTokenInfo, useAuthTokenInfo } from "./useAuthTokenInfo";

export interface IUseIdentityToken {
  loading: boolean;
  error: IUseAuthTokenInfo["error"];
  token: string | null;
  getIdentityToken: () => Promise<string | null>;
}

/**
 * @deprecated Use {@link useAuthTokenInfo} instead.
 */
export const useIdentityToken = (): IUseIdentityToken => {
  const { loading, error, token, getAuthTokenInfo } = useAuthTokenInfo();

  return {
    loading,
    error,
    token,
    getIdentityToken: getAuthTokenInfo,
  };
};
