"use client";

import { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UsersTab, PermissionsTab } from "@/features/usuarios";
import PageHeader from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";

type TabKey = "usuarios" | "permisos";

export default function UsersPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("usuarios");

  if (!authLoading && !isAdmin) {
    redirect("/");
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "usuarios", label: "Usuarios", icon: <Users className="w-4 h-4" /> },
    { key: "permisos", label: "Permisos", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <section className="h-full flex flex-col bg-slate-50">
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios, asigna roles y controla permisos"
        icon={<Users className="w-6 h-6 text-primary-700" />}
      />

      {/* Tab switcher */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 md:px-6 md:py-6 overflow-auto">
        {activeTab === "usuarios" ? <UsersTab /> : <PermissionsTab />}
      </div>
    </section>
  );
}
