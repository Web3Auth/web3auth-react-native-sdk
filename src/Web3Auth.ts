(process as any).browser = true;

import base64url from "base64url";
import log from "loglevel";
import { URL } from "react-native-url-polyfill";
import EventEmitter from 'events';
import {encryptData, decryptData, keccak256 } from '@toruslabs/metadata-helpers';
import { getPublic, sign } from "@toruslabs/eccrypto";
import { IWebBrowser } from "./types/IWebBrowser";
import { SdkInitParams, SdkLoginParams, SdkLogoutParams } from "./types/sdk";
import { State } from "./types/State";
import { Web3AuthApi } from "./api/Web3AuthApi";
import { ShareMetadata } from "./api/model";
import { SecureStore } from "./types/IExpoSecureStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import KeyStore from "./session/KeyStore";

class Web3Auth {
  initParams: SdkInitParams;
  webBrowser: IWebBrowser;
  keyStore: KeyStore;

  constructor(webBrowser: IWebBrowser, storage: SecureStore|EncryptedStorage, initParams: SdkInitParams) {
    this.initParams = initParams;
    if (!this.initParams.sdkUrl) {
      this.initParams.sdkUrl = "https://sdk.openlogin.com";
    }
    this.webBrowser = webBrowser;
    this.keyStore = new KeyStore(storage);
  }

  async init(): Promise<State> {
    return this.authorizeSession();
  }

  async login(options: SdkLoginParams): Promise<State> {
    //check for share
    if (this.initParams.loginConfig) {
      var loginConfigItem = Object.values(this.initParams.loginConfig)[0];
      if (loginConfigItem) {
        var share = await this.keyStore.get(loginConfigItem.verifier);
        if (share) {
            options.dappShare = share
        }
      }
    }

    const result = await this.request("login", options.redirectUrl, options);
    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] login flow failed with error type ${result.type}`);
      throw new Error(`login flow failed with error type ${result.type}`);
    }

    const fragment = new URL(result.url).hash;
    const decodedPayload = base64url.decode(fragment);
    const state = JSON.parse(decodedPayload) as State;

    await this.keyStore.set("sessionId", state?.sessionId);

    if (state.userInfo?.dappShare.length > 0) {
        this.keyStore.set(
          state.userInfo?.verifier,
          state.userInfo?.dappShare,
        )
    }

    return state;
  }

  async logout(options: SdkLogoutParams): Promise<void> {
    this.sessionTimeout();
    const result = await this.request("logout", options.redirectUrl, options);
    if (result.type !== "success" || !result.url) {
      log.error(`[Web3Auth] logout flow failed with error type ${result.type}`);
      throw new Error(`logout flow failed with error type ${result.type}`);
    }
  }

  private async request(path: string, redirectUrl: string, params: Record<string, unknown> = {}) {
    const initParams = {
      ...this.initParams,
      clientId: this.initParams.clientId,
      network: this.initParams.network,
      ...(!!this.initParams.redirectUrl && {
        redirectUrl: this.initParams.redirectUrl,
      }),
    };

    const mergedParams = {
      init: initParams,
      params: {
        ...params,
        ...(!params.redirectUrl && { redirectUrl }),
      },
    };

    log.debug(`[Web3Auth] params passed to Web3Auth: ${mergedParams}`);

    const hash = base64url.encode(JSON.stringify(mergedParams));

    const url = new URL(this.initParams.sdkUrl);
    url.pathname = `${url.pathname}${path}`;
    url.hash = hash;

    log.info(`[Web3Auth] opening login screen in browser at ${url.href}, will redirect to ${redirectUrl}`);

    return this.webBrowser.openAuthSessionAsync(url.href, redirectUrl);
  }

  async authorizeSession(): Promise<State> {
     const sessionId = await this.keyStore.get("sessionId");
     if (sessionId && sessionId.length > 0) {
      var pubKey = getPublic(Buffer.from(sessionId, "hex")).toString("hex");
      var response = await Web3AuthApi.authorizeSession(pubKey);
      if (response.success == false) {
        return;
      }
      var shareMetadata = JSON.parse(response.message) as ShareMetadata;
      
      this.keyStore.set("ephemPublicKey", shareMetadata.ephemPublicKey);
      this.keyStore.set("ivKey", shareMetadata.iv);
      this.keyStore.set("mac", shareMetadata.mac);

      var web3AuthResponse = await decryptData<any>(sessionId, response.message);
      web3AuthResponse["userInfo"] = web3AuthResponse["store"]
      delete web3AuthResponse['store'];

      if (!web3AuthResponse.error) {
        web3AuthResponse = web3AuthResponse as State;
        if (web3AuthResponse.privKey && web3AuthResponse.privKey.trim('0').length > 0) {
          return Promise.resolve(web3AuthResponse);
        }
      } else {
        return Promise.reject(`session recovery failed with error ${web3AuthResponse.error}`);
      }
    }
  }

  async sessionTimeout() {
    const sessionId = await this.keyStore.get("sessionId");
    if (sessionId && sessionId.length > 0) {
      var ephemKey = await this.keyStore.get("ephemPublicKey");
      var ivKey = await this.keyStore.get("ivKey");
      var mac = await this.keyStore.get("mac");

      if (ephemKey?.length == 0 && ivKey?.length == 0) 
        return;

      var encryptedData = await encryptData(sessionId, "");
      var encryptedMetadata: ShareMetadata = {
          iv: ivKey,
          ephemPublicKey: ephemKey,
          ciphertext: encryptedData,
          mac: mac
      };
      var jsonData = JSON.stringify(encryptedMetadata);
      var hashData = keccak256(jsonData);
      try {
        await Web3AuthApi.logout({
          key: getPublic(Buffer.from(sessionId, "hex")).toString("hex"),
          data: jsonData,
          signature: (await sign(Buffer.from(sessionId, "hex"), hashData)).toString("hex"),
          timeout: 1
        });

        this.keyStore.remove("ephemPublicKey");
        this.keyStore.remove("ivKey");
        this.keyStore.remove("mac");

        if (this.initParams.loginConfig) {
          var loginConfigItem = Object.values(this.initParams.loginConfig)[0];
          if (loginConfigItem) {
            this.keyStore.remove(loginConfigItem.verifier);
          }
        }
      } catch (ex) {
        log.error(ex);
      }
    }
  }
}

export default Web3Auth;
