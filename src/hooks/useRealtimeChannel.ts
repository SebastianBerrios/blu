"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  createRealtimeSubscription,
  realtimeStatusReducer,
} from "./realtimeSubscription";
import type {
  PostgresChangesFilter,
  RealtimeChannelStatus,
  RealtimeClientLike,
} from "./realtimeSubscription";

// Re-exported so existing consumers/tests keep importing from this module
export { realtimeStatusReducer };
export type { RealtimeChannelStatus };

interface RealtimeChannelOptions {
  /** Logical channel name — the actual topic is suffixed with a per-mount id */
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

// Module-level counter for genuinely unique topics. useId is position-stable,
// not mount-unique: remounting the same page at the same tree position (back
// navigation, or Strict Mode's dev double-effect) yields the SAME id, so the
// topic-collision window would persist. Consuming the counter inside the
// effect gives every subscription its own topic, closing that window entirely.
let subscriptionSeq = 0;

export function useRealtimeChannel({
  channelName,
  filters,
  onEvent,
}: RealtimeChannelOptions): UseRealtimeChannelReturn {
  const [status, setStatus] = useState<RealtimeChannelStatus>("RECONNECTING");
  const onEventRef = useRef(onEvent);

  // Keep callback ref fresh without recreating the subscription
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // Unique topic per subscription: supabase.channel(name) returns the
    // existing channel when the topic is already registered on the singleton
    // client, so reusing a topic across mounts can hand back an
    // already-subscribed channel and make .on() throw.
    const topic = `${channelName}-${++subscriptionSeq}`;
    const supabase: RealtimeClientLike = createClient();
    const subscription = createRealtimeSubscription({
      client: supabase,
      topic,
      filters,
      onEvent: () => onEventRef.current(),
      onStatus: setStatus,
    });

    return () => subscription.dispose();
    // filters is intentionally excluded: callers pass inline literals and the
    // subscription only depends on channelName for its lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  const reconnect = useCallback(() => {
    // Manual retry: the caller's onEvent triggers an SWR mutate as catch-up.
    onEventRef.current();
  }, []);

  return { realtimeStatus: status, reconnect };
}
