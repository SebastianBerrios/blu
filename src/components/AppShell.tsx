"use client";

import { usePathname } from "next/navigation";
import SideBar from "@/components/SideBar";
import BottomNav from "@/components/ui/BottomNav";
import AuthGuard from "@/components/AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <main className="h-dvh flex flex-col md:flex-row bg-slate-50">
        <SideBar />
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
          <BottomNav />
        </div>
      </main>
    </AuthGuard>
  );
}
