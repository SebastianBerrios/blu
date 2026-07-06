"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import type { RealtimeChannelStatus } from "@/hooks/useRealtimeChannel";

interface StaleDataBannerProps {
  status: RealtimeChannelStatus;
  onRetry: () => void;
}

export default function StaleDataBanner({ status, onRetry }: StaleDataBannerProps) {
  if (status !== "STALE") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mb-4">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
      <span className="flex-1">
        Conexión perdida — los pedidos podrían no estar actualizados
      </span>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md text-xs font-medium transition-colors active:scale-[0.97] min-h-[32px]"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reintentar
      </button>
    </div>
  );
}
