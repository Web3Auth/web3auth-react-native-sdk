import { log } from "./loglevel";
import { SegmentHTTP, Traits } from "./segmentHttp";

const SEGMENT_WRITE_KEY = "f6LbNqCeVRf512ggdME4b6CyflhF1tsX";
// const SEGMENT_WRITE_KEY_DEV = "rpE5pCcpA6ME2oFu2TbuVydhOXapjHs3";

export class Analytics {
  private segment: SegmentHTTP;

  private globalProperties: Record<string, unknown> = {};

  private enabled: boolean = true;

  public init(): void {
    if (this.isSkipped()) {
      return;
    }
    if (this.segment) {
      throw new Error("Analytics already initialized");
    }

    this.segment = new SegmentHTTP(SEGMENT_WRITE_KEY);
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public setGlobalProperties(properties: Record<string, unknown>) {
    this.globalProperties = { ...this.globalProperties, ...properties };
  }

  public async identify(params: { userId?: string; traits?: Traits }) {
    if (!this.enabled) return;
    if (this.isSkipped()) return;
    try {
      this.getSegment().identify(params.userId, params.traits);
      this.setGlobalProperties({ userId: params.userId });
    } catch (error) {
      log.error(`Failed to identify user ${params.userId} in analytics`, error);
    }
  }

  public async track(params: { userId?: string; event: string; properties?: Record<string, unknown>; anonymousId?: string }) {
    if (!this.enabled) return;
    if (this.isSkipped()) return;
    try {
      return this.getSegment().track(
        params.event,
        {
          ...params.properties,
          ...this.globalProperties,
        },
        params.userId ?? (this.globalProperties.userId as string),
        params.anonymousId
      );
    } catch (error) {
      log.error(`Failed to track event ${params.event}`, error, params);
    }
  }

  private getSegment() {
    if (!this.segment) {
      log.error("Analytics not initialized. Call Analytics.init() first.");
      throw new Error("Analytics not initialized. Call Analytics.init() first.");
    }
    return this.segment;
  }

  private isSkipped() {
    // const dappOrigin = window.location.origin;

    // // skip if the protocol is not http or https
    // if (dappOrigin.startsWith("http://")) {
    //   return true;
    // }
    // // skip if dapp contains localhost
    // if (dappOrigin.includes("localhost")) {
    //   return true;
    // }

    // return false;
    return __DEV__;
  }
}

export const ANALYTICS_EVENTS = {
  // SDK Initialization
  SDK_INITIALIZATION_COMPLETED: "SDK Initialization Completed",
  SDK_INITIALIZATION_FAILED: "SDK Initialization Failed",
  SDK_INITIALIZATION_KEYSTORE_CORRUPTED: "SDK Initialization Keystore Corrupted",
  // Connection
  CONNECTION_STARTED: "Connection Started",
  CONNECTION_COMPLETED: "Connection Completed",
  CONNECTION_FAILED: "Connection Failed",
  // Identity Token
  IDENTITY_TOKEN_STARTED: "Identity Token Started",
  IDENTITY_TOKEN_COMPLETED: "Identity Token Completed",
  IDENTITY_TOKEN_FAILED: "Identity Token Failed",
  // MFA
  MFA_ENABLEMENT_STARTED: "MFA Enablement Started",
  MFA_ENABLEMENT_COMPLETED: "MFA Enablement Completed",
  MFA_ENABLEMENT_FAILED: "MFA Enablement Failed",
  MFA_MANAGEMENT_STARTED: "MFA Management Started",
  MFA_MANAGEMENT_SELECTED: "MFA Management Selected",
  MFA_MANAGEMENT_COMPLETED: "MFA Management Completed",
  MFA_MANAGEMENT_FAILED: "MFA Management Failed",
  // Login Modal
  LOGOUT_STARTED: "Logout Started",
  LOGOUT_COMPLETED: "Logout Completed",
  LOGOUT_FAILED: "Logout Failed",
  LOGOUT_KEYSTORE_CORRUPTED: "Logout Keystore Corrupted",
  // request
  REQUEST_FUNCTION_STARTED: "Request Function Started",
  REQUEST_FUNCTION_COMPLETED: "Request Function Completed",
  REQUEST_FUNCTION_FAILED: "Request Function Failed",
  // Wallet Plugin
  WALLET_UI_CLICKED: "Wallet UI Clicked",
  WALLET_SERVICES_FAILED: "Wallet Services Failed",
};

export const ANALYTICS_INTEGRATION_TYPE = {
  REACT_HOOKS: "React Hooks",
  VUE_COMPOSABLES: "Vue Composables",
  NATIVE_SDK: "Native SDK",
};

export const ANALYTICS_SDK_NAME = "React Native";
