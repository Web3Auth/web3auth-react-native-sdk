import { DASHBOARD_PUBLIC_API_MAP } from "@toruslabs/constants";
import { get } from "@toruslabs/http-helpers";
import { decodeBase64Url } from "@toruslabs/metadata-helpers";
import { BUILD_ENV, type BUILD_ENV_TYPE, type WEB3AUTH_NETWORK_TYPE } from "@web3auth/auth";
import log from "loglevel";
import { URL, URLSearchParams } from "react-native-url-polyfill";

import { ProjectConfig } from "./types/interface";

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
