"use client";

import { useState } from "react";
import Link from "next/link";
import { ChefHat, Undo2, Search, Info } from "lucide-react";
import { useProduction } from "@/hooks/useProduction";
import { reverseProduction } from "../services/productionService";
import { fmt } from "../utils/format";
import { normalizeText } from "@/utils/helpers";
import { formatDateTime } from "@/utils/helpers/dateFormatters";
import type { Producible } from "@/types";
import ProduceForm from "./ProduceForm";

interface ProduccionTabProps {
  userId: string | null;
  userName: string | null;
  onInventoryChanged: () => void;
}

function stockTextColor(qty: number, unit: string): string {
  const thresholds: Record<string, number> = {
    kg: 0.5, g: 200, l: 0.5, ml: 200, und: 5, unidad: 5,
  };
  const threshold = thresholds[unit.toLowerCase()] ?? 0.1;
  if (qty <= 0) return "text-red-600";
  if (qty <= threshold) return "text-amber-600";
  return "text-emerald-600";
}

export default function ProduccionTab({
  userId,
  userName,
  onInventoryChanged,
}: ProduccionTabProps) {
  const { producibles, productions, isLoading, mutateProducibles, mutateProductions } =
    useProduction();
  const [target, setTarget] = useState<Producible | null>(null);
  const [search, setSearch] = useState("");
  const [reversingId, setReversingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = producibles.filter((p) =>
    normalizeText(p.ingredient_name).includes(normalizeText(search)),
  );

  const refreshAll = () => {
    mutateProducibles();
    mutateProductions();
    onInventoryChanged();
  };

  const handleReverse = async (productionId: number, description: string) => {
    if (!window.confirm("¿Deshacer esta producción? Se devolverán los insumos y se descontarán las unidades.")) {
      return;
    }
    setReversingId(productionId);
    setError(null);
    try {
      await reverseProduction(productionId, description, userId, userName);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al deshacer la producción");
    } finally {
      setReversingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Explicación del flujo */}
      <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          Aquí solo <span className="font-semibold">fabricas</span> lotes (descuenta insumos y suma stock).
          Para crear o editar un producible ve a{" "}
          <Link href="/recipes" className="font-semibold underline hover:text-emerald-900">
            Recetas
          </Link>{" "}
          y activa «Agregar como ingrediente».
        </p>
      </div>

      {/* Productos producibles */}
      <div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto a producir..."
            className="w-full pl-9 pr-4 py-3 md:py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <ChefHat className="w-10 h-10 mb-2" />
            <p className="text-sm">No hay productos producibles</p>
            <p className="text-xs mb-3 text-center max-w-xs">
              Crea uno en Recetas activando «Agregar como ingrediente» al guardar la receta.
            </p>
            <Link
              href="/recipes"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              Ir a Recetas
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <div
                key={p.ingredient_id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 capitalize truncate">{p.ingredient_name}</p>
                  <p className="text-xs text-slate-500">
                    Stock: <span className={`font-semibold ${stockTextColor(p.stock_quantity, p.ingredient_unit)}`}>{fmt(p.stock_quantity)} {p.ingredient_unit}</span>
                    {" · "}rinde {fmt(p.yield)} {p.yield_unit}/lote
                  </p>
                </div>
                <button
                  onClick={() => setTarget(p)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <ChefHat className="w-4 h-4" />
                  Producir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial reciente de producciones */}
      {productions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Producciones recientes</h3>
          <div className="space-y-2">
            {productions.map((prod) => (
              <div
                key={prod.id}
                className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                  prod.reversed_at ? "border-slate-200 opacity-60" : "border-slate-200"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 capitalize truncate">
                    {prod.ingredient_name}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {fmt(prod.batches)} lote(s) · +{fmt(prod.yield_added)} {prod.ingredient_unit}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(prod.created_at)}
                    {prod.user_name ? ` · ${prod.user_name}` : ""}
                    {prod.reversed_at ? " · revertida" : ""}
                  </p>
                </div>
                {!prod.reversed_at && (
                  <button
                    onClick={() =>
                      handleReverse(
                        prod.id,
                        `${prod.ingredient_name}: ${fmt(prod.batches)} lote(s)`,
                      )
                    }
                    disabled={reversingId === prod.id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-amber-700 hover:bg-amber-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Undo2 className="w-4 h-4" />
                    {reversingId === prod.id ? "..." : "Deshacer"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ProduceForm
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        onSuccess={refreshAll}
        producible={target}
        userId={userId}
        userName={userName}
      />
    </div>
  );
}
