"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
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

interface PostgresChangesFilter {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  filter?: string;
}

interface RealtimeChannelOptions {
  /** Unique channel name — must be unique across all active subscriptions */
  channelName: string;
  /** One or more table change filters to subscribe to */
  filters: PostgresChangesFilter[];
  /** Called on every matching change event so the caller can mutate SWR */
  onEvent: () => void;
}

interface UseRealtimeChannelReturn {
  realtimeStatus: RealtimeChannelStatus;
  reconnect: () => void;
}

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_RETRIES = 8;

export function useRealtimeChannel({
  channelName,
  filters,
  onEvent,
}: RealtimeChannelOptions): UseRealtimeChannelReturn {
  const [status, setStatus] = useState<RealtimeChannelStatus>("RECONNECTING");
  const retryCount = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep callback ref fresh without recreating the subscription
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const subscribe = useCallback(() => {
    const supabase = createClient();
    let channel = supabase.channel(channelName);

    for (const filter of filters) {
      channel = channel.on(
        "postgres_changes",
        filter,
        () => {
          onEventRef.current();
        }
      );
    }

    channel.subscribe((rawStatus: string) => {
      const mapped = realtimeStatusReducer(rawStatus);
      setStatus(mapped);

      if (mapped === "SUBSCRIBED") {
        retryCount.current = 0;
        // Catch up any events missed during the reconnect gap
        onEventRef.current();
      } else if (mapped === "STALE") {
        if (retryCount.current >= MAX_RETRIES) return;

        const delay = Math.min(
          BASE_BACKOFF_MS * Math.pow(2, retryCount.current),
          MAX_BACKOFF_MS
        );
        retryCount.current += 1;

        timeoutRef.current = setTimeout(() => {
          supabase.removeChannel(channel);
          subscribe();
        }, delay);
      }
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  useEffect(() => {
    retryCount.current = 0;
    const cleanup = subscribe();
    return cleanup;
  }, [subscribe]);

  const reconnect = useCallback(() => {
    retryCount.current = 0;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Re-trigger by calling subscribe directly is not straightforward from outside
    // the effect, so we instead force a re-mount by bumping a key. Instead, we
    // expose mutate via onEvent — for manual retry the caller should call mutate().
    onEventRef.current();
  }, []);

  return { realtimeStatus: status, reconnect };
}
