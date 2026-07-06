"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import SideBar from "@/components/SideBar";
import BottomNav from "@/components/ui/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import { ConfirmProvider } from "@/hooks/useConfirm";

function handleSWRError(error: unknown): void {
  // Ignore user-triggered aborts
  if (error instanceof DOMException && error.name === "AbortError") return;

  console.error("[SWR]", error);

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureException(error);
  });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  return (
    <SWRConfig value={{ onError: handleSWRError }}>
    <ConfirmProvider>
      <AuthGuard>
        <main className="h-dvh flex flex-col md:flex-row bg-slate-50">
          <SideBar />
          <div className="flex-1 h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
            <BottomNav />
          </div>
        </main>
      </AuthGuard>
      <Toaster position="top-right" richColors closeButton />
    </ConfirmProvider>
    </SWRConfig>
  );
}
