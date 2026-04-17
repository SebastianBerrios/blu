"use client";

import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  fixedHeight?: boolean;
}

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  fixedHeight = true,
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={fixedHeight ? "h-64 md:h-72" : undefined}>{children}</div>
    </div>
  );
}
