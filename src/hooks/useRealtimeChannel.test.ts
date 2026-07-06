import { describe, it, expect } from "vitest";
import { realtimeStatusReducer } from "./useRealtimeChannel";
import type { RealtimeChannelStatus } from "./useRealtimeChannel";

describe("realtimeStatusReducer", () => {
  it("maps SUBSCRIBED to SUBSCRIBED", () => {
    expect(realtimeStatusReducer("SUBSCRIBED")).toBe("SUBSCRIBED");
  });

  it("maps CHANNEL_ERROR to STALE", () => {
    expect(realtimeStatusReducer("CHANNEL_ERROR")).toBe("STALE");
  });

  it("maps TIMED_OUT to STALE", () => {
    expect(realtimeStatusReducer("TIMED_OUT")).toBe("STALE");
  });

  it("maps CLOSED to STALE", () => {
    expect(realtimeStatusReducer("CLOSED")).toBe("STALE");
  });

  it("maps unknown status to RECONNECTING", () => {
    expect(realtimeStatusReducer("CONNECTING")).toBe("RECONNECTING");
  });

  it("maps empty string to RECONNECTING", () => {
    expect(realtimeStatusReducer("")).toBe("RECONNECTING");
  });

  it("result type is narrowed to RealtimeChannelStatus", () => {
    const result: RealtimeChannelStatus = realtimeStatusReducer("SUBSCRIBED");
    expect(result).toBe("SUBSCRIBED");
  });
});
