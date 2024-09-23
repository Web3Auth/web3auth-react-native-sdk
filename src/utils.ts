import { SIGNER_MAP } from "@toruslabs/constants";
import { get } from "@toruslabs/http-helpers";
import { safeatob, WEB3AUTH_NETWORK, WEB3AUTH_NETWORK_TYPE } from "@web3auth/auth";
import log from "loglevel";
import { URL, URLSearchParams } from "react-native-url-polyfill";

import { ProjectConfigResponse } from "./index";

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
  error?: string;
  state?: string;
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
      const queryParams = JSON.parse(safeatob(queryResult));
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
      const hashParams = JSON.parse(safeatob(hashResult));
      Object.keys(hashParams).forEach((key: string) => {
        result[key as keyof HashQueryParamResult] = hashParams[key];
      });
    } catch (error) {
      log.error(error);
    }
  }

  return result;
}

export const signerHost = (web3AuthNetwork?: WEB3AUTH_NETWORK_TYPE): string => {
  return SIGNER_MAP[web3AuthNetwork ?? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET];
};

export const fetchProjectConfig = async (clientId: string, web3AuthNetwork: WEB3AUTH_NETWORK_TYPE): Promise<ProjectConfigResponse> => {
  try {
    const url = new URL(`${signerHost(web3AuthNetwork)}/api/configuration`);
    url.searchParams.append("project_id", clientId);
    url.searchParams.append("network", web3AuthNetwork);
    url.searchParams.append("whitelist", "true");
    //log.debug("Fetching project configuration from URL:", url.href);
    const res = await get<ProjectConfigResponse>(url.href);
    //log.debug(`[Web3Auth] config response: ${JSON.stringify(res)}`);
    return res;
  } catch (e) {
    throw new Error(`Failed to fetch project config: ${(e as Error).message}`);
  }
};
