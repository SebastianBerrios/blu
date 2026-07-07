import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRealtimeSubscription,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MAX_RETRIES,
} from "./realtimeSubscription";
import type {
  ChannelLike,
  PostgresChangesFilter,
  RealtimeClientLike,
} from "./realtimeSubscription";

/** Faithful to @supabase/realtime-js: `.on()` throws once the channel is
 *  subscribed (isJoined/isJoining guard, RealtimeChannel.js:393). */
class FakeChannel implements ChannelLike {
  readonly topic: string;
  subscribed = false;
  onCalls: Array<{ type: string; filter: PostgresChangesFilter }> = [];
  statusCallback: ((status: string) => void) | null = null;

  constructor(topic: string) {
    this.topic = topic;
  }

  on(type: "postgres_changes", filter: PostgresChangesFilter): ChannelLike {
    if (this.subscribed) {
      throw new Error(
        `cannot add postgres_changes callbacks for realtime:${this.topic} after subscribe()`
      );
    }
    this.onCalls.push({ type, filter });
    return this;
  }

  subscribe(callback: (status: string) => void): unknown {
    this.statusCallback = callback;
    this.subscribed = true;
    return this;
  }

  emit(status: string): void {
    this.statusCallback?.(status);
  }
}

/** Faithful to @supabase/realtime-js: `channel(topic)` returns the EXISTING
 *  channel while the topic is still registered (RealtimeClient.js:308), and
 *  `removeChannel` fires CLOSED into the channel's status callback BEFORE
 *  resolving, only then unregistering the topic. */
class FakeClient implements RealtimeClientLike {
  channels: FakeChannel[] = [];
  registered = new Map<string, FakeChannel>();
  removed: FakeChannel[] = [];

  channel(name: string): ChannelLike {
    const existing = this.registered.get(name);
    if (existing) return existing;
    const channel = new FakeChannel(name);
    this.channels.push(channel);
    this.registered.set(name, channel);
    return channel;
  }

  removeChannel(channel: ChannelLike): unknown {
    const fake = channel as FakeChannel;
    this.removed.push(fake);
    fake.emit("CLOSED");
    fake.subscribed = false;
    this.registered.delete(fake.topic);
    return Promise.resolve("ok");
  }

  get lastChannel(): FakeChannel {
    return this.channels[this.channels.length - 1];
  }
}

const FILTERS: PostgresChangesFilter[] = [
  { event: "*", schema: "public", table: "sales" },
  { event: "*", schema: "public", table: "sale_products" },
];

function setup(overrides?: { filters?: PostgresChangesFilter[] }) {
  const client = new FakeClient();
  const onEvent = vi.fn();
  const onStatus = vi.fn();
  const subscription = createRealtimeSubscription({
    client,
    topic: "test-topic",
    filters: overrides?.filters ?? FILTERS,
    onEvent,
    onStatus,
  });
  return { client, onEvent, onStatus, subscription };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRealtimeSubscription", () => {
  it("attaches one .on per filter and subscribes", () => {
    const { client } = setup();

    expect(client.channels).toHaveLength(1);
    const channel = client.lastChannel;
    expect(channel.topic).toBe("test-topic");
    expect(channel.onCalls).toHaveLength(FILTERS.length);
    expect(channel.onCalls[0]).toEqual({
      type: "postgres_changes",
      filter: FILTERS[0],
    });
    expect(channel.onCalls[1]).toEqual({
      type: "postgres_changes",
      filter: FILTERS[1],
    });
    expect(channel.statusCallback).not.toBeNull();
  });

  it("on SUBSCRIBED reports status, fires catch-up onEvent, and resets retries", async () => {
    const { client, onEvent, onStatus } = setup();

    // Burn one retry so the counter is non-zero
    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS);
    expect(client.channels).toHaveLength(2);

    client.lastChannel.emit("SUBSCRIBED");
    expect(onStatus).toHaveBeenLastCalledWith("SUBSCRIBED");
    expect(onEvent).toHaveBeenCalledTimes(1);

    // Counter was reset: next STALE retries at BASE_BACKOFF_MS again, not doubled
    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS);
    expect(client.channels).toHaveLength(3);
  });

  it("on CLOSED reports STALE, removes the old channel, and re-subscribes after backoff", async () => {
    const { client, onStatus } = setup();
    const firstChannel = client.lastChannel;

    firstChannel.emit("CLOSED");
    expect(onStatus).toHaveBeenLastCalledWith("STALE");
    expect(client.channels).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS);
    expect(client.removed).toContain(firstChannel);
    expect(client.channels).toHaveLength(2);
    expect(client.lastChannel.statusCallback).not.toBeNull();
  });

  it("coalesces CHANNEL_ERROR followed by CLOSED into exactly one retry chain", async () => {
    const { client } = setup();

    // A socket drop fires both — each maps to STALE
    client.lastChannel.emit("CHANNEL_ERROR");
    client.lastChannel.emit("CLOSED");

    // Only one retry timer may be pending, otherwise the second chain's
    // subscribe() gets the already-joined channel back and .on() throws
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS * 4);
    expect(client.channels).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores the late CLOSED that removeChannel fires into the superseded channel during a retry", async () => {
    const { client, onStatus } = setup();

    client.lastChannel.emit("CLOSED");
    onStatus.mockClear();

    // Timer fires → removeChannel emits CLOSED into the old channel's callback
    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS);

    expect(onStatus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(client.channels).toHaveLength(2);
  });

  it("does not resubscribe when disposed between timer fire and removeChannel settling", async () => {
    const { client, subscription } = setup();

    let resolveRemoval!: (value: string) => void;
    const originalRemove = client.removeChannel.bind(client);
    client.removeChannel = (channel: ChannelLike) => {
      originalRemove(channel);
      return new Promise<string>((resolve) => {
        resolveRemoval = resolve;
      });
    };

    client.lastChannel.emit("CLOSED");
    // Sync advance: timer fires, removeChannel called, promise still pending
    vi.advanceTimersByTime(BASE_BACKOFF_MS);
    subscription.dispose();

    resolveRemoval("ok");
    await vi.runAllTimersAsync();

    expect(client.channels).toHaveLength(1);
  });

  it("reports STALE when removeChannel rejects instead of dying silently", async () => {
    const { client, onStatus } = setup();

    client.removeChannel = () => Promise.reject(new Error("socket gone"));

    client.lastChannel.emit("CLOSED");
    onStatus.mockClear();

    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS);

    expect(onStatus).toHaveBeenCalledWith("STALE");
    expect(client.channels).toHaveLength(1);
  });

  it("ignores a late CLOSED status after dispose (zombie-retry regression)", async () => {
    const { client, onStatus, subscription } = setup();
    const channel = client.lastChannel;

    subscription.dispose();
    expect(client.removed).toContain(channel);

    onStatus.mockClear();
    // removeChannel fires a late CLOSED into the still-attached callback
    channel.emit("CLOSED");

    expect(onStatus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS * 2);
    expect(client.channels).toHaveLength(1);
  });

  it("dispose clears a pending retry timer", async () => {
    const { client, subscription } = setup();

    client.lastChannel.emit("CLOSED");
    subscription.dispose();

    await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS * 2);
    expect(client.channels).toHaveLength(1);
  });

  it("stops retrying after MAX_RETRIES", async () => {
    const { client } = setup();

    for (let i = 0; i < MAX_RETRIES; i++) {
      client.lastChannel.emit("CLOSED");
      await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS);
    }
    expect(client.channels).toHaveLength(1 + MAX_RETRIES);

    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS * 4);
    expect(client.channels).toHaveLength(1 + MAX_RETRIES);
  });

  it("uses exponential backoff delays capped at MAX_BACKOFF_MS", async () => {
    const { client } = setup();

    // Retry 1: BASE_BACKOFF_MS (2000)
    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS - 1);
    expect(client.channels).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(client.channels).toHaveLength(2);

    // Retry 2: BASE_BACKOFF_MS * 2 (4000)
    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(BASE_BACKOFF_MS * 2 - 1);
    expect(client.channels).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(client.channels).toHaveLength(3);

    // Retries 3 and 4 (8000, 16000)
    for (const delay of [8_000, 16_000]) {
      client.lastChannel.emit("CLOSED");
      await vi.advanceTimersByTimeAsync(delay);
    }
    expect(client.channels).toHaveLength(5);

    // Retry 5: 2000 * 2^4 = 32000 → capped at MAX_BACKOFF_MS (30000)
    client.lastChannel.emit("CLOSED");
    await vi.advanceTimersByTimeAsync(MAX_BACKOFF_MS - 1);
    expect(client.channels).toHaveLength(5);
    await vi.advanceTimersByTimeAsync(1);
    expect(client.channels).toHaveLength(6);
  });

  it("forwards postgres_changes events to onEvent", () => {
    const client = new FakeClient();
    const onEvent = vi.fn();
    const eventCallbacks: Array<(payload: unknown) => void> = [];

    class CapturingChannel extends FakeChannel {
      on(
        type: "postgres_changes",
        filter: PostgresChangesFilter,
        callback?: (payload: unknown) => void
      ): ChannelLike {
        if (callback) eventCallbacks.push(callback);
        return super.on(type, filter);
      }
    }
    client.channel = (name: string) => {
      const channel = new CapturingChannel(name);
      client.channels.push(channel);
      return channel;
    };

    createRealtimeSubscription({
      client,
      topic: "test-topic",
      filters: FILTERS,
      onEvent,
      onStatus: vi.fn(),
    });

    expect(eventCallbacks).toHaveLength(FILTERS.length);
    eventCallbacks[0]({});
    expect(onEvent).toHaveBeenCalledTimes(1);
  });
});
