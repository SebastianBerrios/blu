"use client";

import type { ReactNode } from "react";

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  iconColor: string;
}

export default function KPICard({
  icon,
  label,
  value,
  color,
  iconColor,
}: KPICardProps) {
  return (
    <div className={`rounded-xl border-2 p-4 md:p-5 ${color}`}>
      <div className={`mb-2 ${iconColor}`}>{icon}</div>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-lg md:text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}
