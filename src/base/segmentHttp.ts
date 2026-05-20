// analytics/segmentHttp.ts
import { Platform } from "react-native";

export type Ctx = Record<string, unknown>;
export type Traits = Record<string, unknown>;
export type Properties = Record<string, unknown>;

const SEGMENT_API_URL = "https://api.segment.io/v1";

// TODO: Add basic offline queue/retry with AsyncStorage
export class SegmentHTTP {
  constructor(
    private writeKey: string,
    private context: Ctx = {}
  ) {}

  identify(userId?: string, traits?: Traits) {
    return fetch(`${SEGMENT_API_URL}/identify`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        userId,
        traits,
        context: this.baseCtx(),
        timestamp: new Date().toISOString(),
      }),
    });
  }

  track(event: string, properties?: Properties, userId?: string, anonymousId?: string) {
    return fetch(`${SEGMENT_API_URL}/track`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        event,
        properties,
        userId,
        anonymousId,
        context: this.baseCtx(),
        timestamp: new Date().toISOString(),
      }),
    });
  }

  screen(name: string, properties?: Properties, userId?: string, anonymousId?: string) {
    return fetch(`${SEGMENT_API_URL}/screen`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        name,
        properties,
        userId,
        anonymousId,
        context: this.baseCtx(),
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private headers() {
    const auth = Buffer.from(`${this.writeKey}:`).toString("base64");
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    };
  }

  private baseCtx(): Ctx {
    return {
      os: { name: Platform.OS },
      ...this.context,
    };
  }
}
