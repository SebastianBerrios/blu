"use client";

import { Clock, FileText, Wallet, type LucideIcon } from "lucide-react";

export type TabId = "horario" | "solicitudes" | "acumulado";

interface ScheduleTabsNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  pendingCount: number;
  isAdmin: boolean;
}

export default function ScheduleTabsNav({
  activeTab,
  onChange,
  pendingCount,
  isAdmin,
}: ScheduleTabsNavProps) {
  const tabs: { id: TabId; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "horario", label: "Horario", icon: Clock },
    {
      id: "solicitudes",
      label: "Solicitudes",
      icon: FileText,
      badge: isAdmin && pendingCount > 0 ? pendingCount : undefined,
    },
    { id: "acumulado", label: "Acumulado", icon: Wallet },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
