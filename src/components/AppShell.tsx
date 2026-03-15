"use client";

import { usePathname } from "next/navigation";
import SideBar from "@/components/SideBar";
import AuthGuard from "@/components/AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <main className="h-dvh flex bg-primary-50">
        <SideBar />
        <div className="flex-1 h-full overflow-hidden pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </AuthGuard>
  );
}
