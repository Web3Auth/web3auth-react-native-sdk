import { CHAIN_NAMESPACES } from "@toruslabs/base-controllers";
import { DASHBOARD_PUBLIC_API_MAP } from "@toruslabs/constants";
import { type AccountAbstractionMultiChainConfig } from "@toruslabs/ethereum-controllers";
import { get } from "@toruslabs/http-helpers";
import { decodeBase64Url } from "@toruslabs/metadata-helpers";
import { BUILD_ENV, type BUILD_ENV_TYPE, type WEB3AUTH_NETWORK_TYPE, type WhiteLabelData } from "@web3auth/auth";
import { getCaipChainId } from "@web3auth/no-modal";
import log from "loglevel";
import { URL, URLSearchParams } from "react-native-url-polyfill";

import { Web3authRNError } from "./errors";
import { ProjectConfig, type SdkInitParams, type WalletServicesConfig } from "./types/interface";

export function constructURL(params: { baseURL: string; query?: Record<string, unknown>; hash?: Record<string, unknown> }): string {
  const { baseURL, query, hash } = params;

  const url = new URL(baseURL);
  if (query) {
    Object.keys(query).forEach((key) => {
      url.searchParams.append(key, query[key] as string);
    });
  }
  if (hash) {
    const h = new URL(constructURL({ baseURL, query: hash })).searchParams.toString();
    url.hash = h;
  }
  return url.toString();
}

export type HashQueryParamResult = {
  sessionId?: string;
  sessionNamespace?: string;
  // v11 auth redirect tokens required by AuthSessionManager.authorize()
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  error?: string;
  state?: string;
  nonce?: string;
  // Used only for request method
  success?: string;
  result?: string;
};

export function getHashQueryParams(url: string): HashQueryParamResult {
  const result: HashQueryParamResult = {};
  const urlObj = new URL(url);

  const queryUrlParams = new URLSearchParams(urlObj.search.slice(1));
  queryUrlParams.forEach((value: string, key: string) => {
    if (key !== "b64Params") {
      result[key as keyof HashQueryParamResult] = value;
    }
  });
  const queryResult = queryUrlParams.get("b64Params");
  if (queryResult) {
    try {
      const queryParams = JSON.parse(decodeBase64Url(queryResult));
      Object.keys(queryParams).forEach((key: string) => {
        result[key as keyof HashQueryParamResult] = queryParams[key];
      });
    } catch (error) {
      log.error(error);
    }
  }

  const hashUrlParams = new URLSearchParams(urlObj.hash.substring(1));
  hashUrlParams.forEach((value: string, key: string) => {
    if (key !== "b64Params") {
      result[key as keyof HashQueryParamResult] = value;
    }
  });

  const hashResult = hashUrlParams.get("b64Params");
  if (hashResult) {
    try {
      const hashParams = JSON.parse(decodeBase64Url(hashResult));
      Object.keys(hashParams).forEach((key: string) => {
        result[key as keyof HashQueryParamResult] = hashParams[key];
      });
    } catch (error) {
      log.error(error);
    }
  }

  return result;
}

export function generateRecordId(): string {
  const cr = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof cr?.randomUUID === "function") return cr.randomUUID();
  // UUIDv4 fallback for Hermes without crypto.randomUUID (recordId is analytics-only)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const fetchProjectConfig = async (
  clientId: string,
  web3AuthNetwork: WEB3AUTH_NETWORK_TYPE,
  buildEnv?: BUILD_ENV_TYPE,
  aaProvider?: string
): Promise<ProjectConfig> => {
  try {
    const url = new URL(`${DASHBOARD_PUBLIC_API_MAP[buildEnv ?? BUILD_ENV.PRODUCTION]}/api/v2/configuration`);
    url.searchParams.append("project_id", clientId);
    url.searchParams.append("network", web3AuthNetwork);
    if (buildEnv) url.searchParams.append("build_env", buildEnv);
    if (aaProvider) url.searchParams.append("aa_provider", aaProvider);
    const res = await get<ProjectConfig>(url.href);
    return res;
  } catch (e) {
    // @toruslabs/http-helpers throws the raw Response object on non-2xx.
    // Read the body to surface the actual API error message.
    if (e instanceof Response) {
      let detail: string;
      try {
        const body = await (e as Response).json();
        detail = body.error || body.message || (e as Response).statusText || `HTTP ${(e as Response).status}`;
      } catch {
        detail = (e as Response).statusText || `HTTP ${(e as Response).status}`;
      }
      throw new Error(`Failed to fetch project config: ${detail}`);
    }
    throw new Error(`Failed to fetch project config: ${(e as Error).message}`);
  }
};

export const getHostname = (url?: string): string => {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

export const getWhitelabelAnalyticsProperties = (uiConfig?: WhiteLabelData) => {
  return {
    whitelabel_app_name: uiConfig?.appName,
    whitelabel_app_url: uiConfig?.appUrl,
    whitelabel_logo_light_enabled: Boolean(uiConfig?.logoLight),
    whitelabel_logo_dark_enabled: Boolean(uiConfig?.logoDark),
    whitelabel_default_language: uiConfig?.defaultLanguage,
    whitelabel_theme_mode: uiConfig?.mode,
    whitelabel_use_logo_loader: uiConfig?.useLogoLoader,
    whitelabel_theme_primary: uiConfig?.theme?.primary,
    whitelabel_theme_on_primary: uiConfig?.theme?.onPrimary,
    whitelabel_tnc_link_enabled: Boolean(uiConfig?.tncLink),
    whitelabel_privacy_policy_enabled: Boolean(uiConfig?.privacyPolicy),
  };
};

export const getAaAnalyticsProperties = (accountAbstractionConfig?: AccountAbstractionMultiChainConfig | null) => {
  const bundlerHostnames = Array.from(
    new Set(accountAbstractionConfig?.chains?.map((chain) => getHostname(chain.bundlerConfig?.url)).filter(Boolean))
  );
  const paymasterHostnames = Array.from(
    new Set(accountAbstractionConfig?.chains?.map((chain) => getHostname(chain.paymasterConfig?.url)).filter(Boolean))
  );
  return {
    aa_smart_account_type: accountAbstractionConfig?.smartAccountType,
    aa_chain_ids: accountAbstractionConfig?.chains?.map((chain) =>
      getCaipChainId({ chainId: chain.chainId, chainNamespace: CHAIN_NAMESPACES.EIP155 })
    ),
    aa_bundler_urls: bundlerHostnames,
    aa_paymaster_urls: paymasterHostnames,
    aa_paymaster_enabled: paymasterHostnames.length > 0,
    aa_paymaster_context_enabled: accountAbstractionConfig?.chains?.some((chain) => chain.bundlerConfig?.paymasterContext),
    aa_erc20_paymaster_enabled: accountAbstractionConfig?.chains?.some(
      (chain) => (chain.bundlerConfig?.paymasterContext as { token?: string } | undefined)?.token
    ),
  };
};

export const getWalletServicesAnalyticsProperties = (walletServicesConfig?: WalletServicesConfig) => {
  return {
    ws_confirmation_strategy: walletServicesConfig?.confirmationStrategy,
    ws_enable_key_export: walletServicesConfig?.enableKeyExport,
    ws_show_widget_button: walletServicesConfig?.whiteLabel?.showWidgetButton,
    ws_button_position: walletServicesConfig?.whiteLabel?.buttonPosition,
    ws_hide_nft_display: walletServicesConfig?.whiteLabel?.hideNftDisplay,
    ws_hide_token_display: walletServicesConfig?.whiteLabel?.hideTokenDisplay,
    ws_hide_transfers: walletServicesConfig?.whiteLabel?.hideTransfers,
    ws_hide_topup: walletServicesConfig?.whiteLabel?.hideTopup,
    ws_hide_receive: walletServicesConfig?.whiteLabel?.hideReceive,
    ws_hide_swap: walletServicesConfig?.whiteLabel?.hideSwap,
    ws_hide_show_all_tokens: walletServicesConfig?.whiteLabel?.hideShowAllTokens,
    ws_hide_wallet_connect: walletServicesConfig?.whiteLabel?.hideWalletConnect,
    ws_hide_defi_positions_display: walletServicesConfig?.whiteLabel?.hideDefiPositionsDisplay,
    ws_default_portfolio: walletServicesConfig?.whiteLabel?.defaultPortfolio,
  };
};

export const getErrorAnalyticsProperties = (error: unknown): { error_message?: string; error_code?: number } => {
  try {
    const code = error instanceof Web3authRNError ? error.code : (error as { code?: number } | null)?.code;
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string } | null)?.message || (error as { toString?: () => string } | null)?.toString?.() || String(error);
    return { error_message: message, error_code: code };
  } catch {
    return { error_message: "Unknown error", error_code: undefined };
  }
};

export const getInitializationTrackData = (options: SdkInitParams): Record<string, unknown> => {
  try {
    const defaultChain = options.chains?.find((chain) => chain.chainId === options.defaultChainId);
    const rpcHostnames = Array.from(new Set(options.chains?.map((chain) => getHostname(chain.rpcTarget)).filter(Boolean)));
    return {
      chain_ids: options.chains?.map((chain) => getCaipChainId(chain)),
      chain_names: options.chains?.map((chain) => chain.displayName),
      chain_rpc_targets: rpcHostnames,
      default_chain_id: defaultChain ? getCaipChainId(defaultChain) : undefined,
      default_chain_name: defaultChain?.displayName,
      logging_enabled: options.enableLogging,
      session_time: options.sessionTime,
      sfa_key_enabled: options.useCoreKitKey,
      auth_build_env: options.buildEnv,
      auth_mfa_settings: Object.keys(options.mfaSettings || {}),
      aa_enabled_for_external_wallets: options.accountAbstractionConfig ? options.useAAWithExternalWallet : undefined,
      ...getWhitelabelAnalyticsProperties(options.whiteLabel),
      ...getAaAnalyticsProperties(options.accountAbstractionConfig),
      ...getWalletServicesAnalyticsProperties(options.walletServicesConfig),
    };
  } catch (error) {
    log.error("Failed to get initialization track data", error);
    return {};
  }
};
