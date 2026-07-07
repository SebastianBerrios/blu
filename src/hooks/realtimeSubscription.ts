export type RealtimeChannelStatus = "SUBSCRIBED" | "RECONNECTING" | "STALE";

/** Pure function — maps Supabase channel status strings to our domain status.
 *  Exported for unit-testing without needing a React environment. */
export function realtimeStatusReducer(raw: string): RealtimeChannelStatus {
  if (raw === "SUBSCRIBED") return "SUBSCRIBED";
  if (raw === "CHANNEL_ERROR" || raw === "TIMED_OUT" || raw === "CLOSED") {
    return "STALE";
  }
  return "RECONNECTING";
}

export interface PostgresChangesFilter {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  filter?: string;
}

/** Minimal structural interfaces so tests can inject a hand-rolled fake client. */
export interface ChannelLike {
  on(
    type: "postgres_changes",
    filter: PostgresChangesFilter,
    callback: (payload: unknown) => void
  ): ChannelLike;
  subscribe(callback: (status: string) => void): unknown;
}

export interface RealtimeClientLike {
  channel(name: string): ChannelLike;
  removeChannel(channel: ChannelLike): unknown;
}

export interface RealtimeSubscriptionOptions {
  client: RealtimeClientLike;
  topic: string;
  filters: PostgresChangesFilter[];
  /** Called on every matching change event and on (re)subscribe as catch-up */
  onEvent: () => void;
  /** Called on every status transition while the subscription is live */
  onStatus: (status: RealtimeChannelStatus) => void;
}

export interface RealtimeSubscription {
  dispose(): void;
}

export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 30_000;
export const MAX_RETRIES = 8;

/** Framework-free realtime subscription manager with exponential backoff.
 *  Owns the channel lifecycle; `dispose()` makes every later status callback
 *  a no-op so removeChannel's late CLOSED can never schedule a zombie retry. */
export function createRealtimeSubscription({
  client,
  topic,
  filters,
  onEvent,
  onStatus,
}: RealtimeSubscriptionOptions): RealtimeSubscription {
  let disposed = false;
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let currentChannel: ChannelLike | null = null;

  function subscribe(): void {
    let channel = client.channel(topic);

    for (const filter of filters) {
      channel = channel.on("postgres_changes", filter, () => {
        onEvent();
      });
    }
    currentChannel = channel;

    channel.subscribe((rawStatus: string) => {
      // Ignore late statuses from disposed or superseded channels —
      // removeChannel fires CLOSED into the old callback during teardown.
      if (disposed || channel !== currentChannel) return;

      const mapped = realtimeStatusReducer(rawStatus);
      onStatus(mapped);

      if (mapped === "SUBSCRIBED") {
        retryCount = 0;
        // Catch up any events missed during the reconnect gap
        onEvent();
      } else if (mapped === "STALE") {
        // Coalesce: a socket drop fires CHANNEL_ERROR then CLOSED — a second
        // timer would fork a parallel retry chain whose subscribe() gets the
        // already-joined channel back from the topic registry and .on() throws.
        if (retryTimer !== null) return;
        if (retryCount >= MAX_RETRIES) return;

        const delay = Math.min(
          BASE_BACKOFF_MS * Math.pow(2, retryCount),
          MAX_BACKOFF_MS
        );
        retryCount += 1;

        retryTimer = setTimeout(() => {
          retryTimer = null;
          // Supersede before removal so the CLOSED that removeChannel fires
          // into this channel's callback is ignored by the guard above.
          currentChannel = null;
          // Let removal settle before re-creating, and never resubscribe
          // after dispose — even if dispose happened while removal was pending.
          Promise.resolve(client.removeChannel(channel))
            .then(() => {
              if (!disposed) subscribe();
            })
            .catch(() => {
              // Removal failed: the retry chain is dead — surface it so the
              // UI reflects reality instead of freezing on a stale status.
              if (!disposed) onStatus("STALE");
            });
        }, delay);
      }
    });
  }

  subscribe();

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (currentChannel) client.removeChannel(currentChannel);
    },
  };
}
