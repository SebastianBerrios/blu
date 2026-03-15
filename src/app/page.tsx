"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Spinner from "@/components/ui/Spinner";

export default function Page() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (role === "admin") {
      router.replace("/categories");
    } else if (role === "barista" || role === "cocinero") {
      router.replace("/sales");
    }
  }, [role, isLoading, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <Spinner text="Cargando..." size="md" />
    </div>
  );
}
