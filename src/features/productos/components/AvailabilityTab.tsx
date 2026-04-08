"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { toggleProductAvailability } from "../services/productAvailabilityService";
import type { Product, Category } from "@/types";
import type { KeyedMutator } from "swr";
import type { Tables } from "@/types/database";

interface AvailabilityTabProps {
  products: Product[];
  categories: Category[];
  isAdmin: boolean;
  user: { id: string; email: string } | null;
  profile: Tables<"user_profiles"> | null;
  mutate: KeyedMutator<Product[]>;
}

export default function AvailabilityTab({
  products,
  categories,
  isAdmin,
  user,
  profile,
  mutate,
}: AvailabilityTabProps) {
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    const list = search.trim()
      ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : [...products];
    return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products, search]);

  const handleToggle = async (product: Product) => {
    if (togglingId) return;
    const newValue = !product.is_available;
    setTogglingId(product.id);
    setError(null);

    // Optimistic update
    mutate(
      products.map((p) =>
        p.id === product.id ? { ...p, is_available: newValue } : p,
      ),
      false,
    );

    try {
      await toggleProductAvailability(
        product,
        newValue,
        user?.id ?? null,
        profile?.full_name ?? null,
      );
      mutate();
    } catch (err) {
      // Revert optimistic update
      mutate(
        products.map((p) =>
          p.id === product.id ? { ...p, is_available: !newValue } : p,
        ),
        false,
      );
      setError(
        err instanceof Error ? err.message : "Error al cambiar disponibilidad",
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Product list */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No se encontraron productos
          </div>
        ) : (
          filtered.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 capitalize truncate">
                  {product.name}
                </p>
                {product.category_id && (
                  <p className="text-xs text-slate-500">
                    {categoryMap.get(product.category_id) ?? ""}
                  </p>
                )}
              </div>

              {isAdmin ? (
                <button
                  role="switch"
                  aria-checked={product.is_available}
                  disabled={togglingId === product.id}
                  onClick={() => handleToggle(product)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                    product.is_available ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                      product.is_available ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              ) : (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    product.is_available
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {product.is_available ? "Disponible" : "No disponible"}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
