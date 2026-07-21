"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { UseFormSetValue } from "react-hook-form";
import type { CreateProduct, Product, ProductComponentLine } from "@/types";
import { normalizeText } from "@/utils/helpers";

interface BundleSelectorProps {
  products: Product[];
  currentProductId?: number;
  currentCategoryId?: number;
  components: ProductComponentLine[];
  onChange: (lines: ProductComponentLine[]) => void;
  setValue: UseFormSetValue<CreateProduct>;
  isSubmitting: boolean;
}

export default function BundleSelector({
  products,
  currentProductId,
  currentCategoryId,
  components,
  onChange,
  setValue,
  isSubmitting,
}: BundleSelectorProps) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const total = components.reduce(
    (sum, c) => sum + c.unit_cost * c.quantity,
    0,
  );

  // El costo del combo = suma de sus componentes (se persiste en manufacturing_cost).
  useEffect(() => {
    setValue("manufacturing_cost", Number(total.toFixed(2)), {
      shouldValidate: true,
    });
  }, [total, setValue]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".bundle-search-container")) {
        setShowDropdown(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  const addedIds = new Set(components.map((c) => c.component_product_id));

  const filtered = products.filter(
    (p) =>
      p.id !== currentProductId &&
      // Excluye productos de la misma categoría (los combos viven en "promociones"),
      // evitando combos dentro de combos.
      (currentCategoryId == null || p.category_id !== currentCategoryId) &&
      !addedIds.has(p.id) &&
      normalizeText(p.name).includes(normalizeText(search)),
  );

  const handleAdd = (p: Product) => {
    setSearch("");
    setShowDropdown(false);
    onChange([
      ...components,
      {
        component_product_id: p.id,
        component_name: p.name,
        quantity: 1,
        unit_cost: p.manufacturing_cost ?? 0,
      },
    ]);
  };

  const handleQuantity = (id: number, qty: number) => {
    onChange(
      components.map((c) =>
        c.component_product_id === id
          ? { ...c, quantity: qty > 0 ? qty : 1 }
          : c,
      ),
    );
  };

  const handleRemove = (id: number) => {
    onChange(components.filter((c) => c.component_product_id !== id));
  };

  return (
    <>
      <div className="relative bundle-search-container mb-3">
        <label className="block text-sm font-medium text-blue-900 mb-1.5">
          Agregar productos del combo
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Buscar producto para agregar al combo..."
        />
        {showDropdown && search && filtered.length > 0 && (
          <ul className="absolute z-20 w-full mt-1 bg-white border border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((p) => (
              <li
                key={p.id}
                onClick={() => handleAdd(p)}
                className="px-4 py-3.5 hover:bg-blue-50 cursor-pointer transition-colors capitalize flex justify-between items-center gap-2"
              >
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="text-xs text-blue-600 font-medium shrink-0">
                  S/ {(p.manufacturing_cost ?? 0).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {components.length > 0 ? (
        <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm space-y-2">
          {components.map((c) => (
            <div
              key={c.component_product_id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="flex-1 capitalize text-blue-900 truncate">
                {c.component_name}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={c.quantity}
                onChange={(e) =>
                  handleQuantity(
                    c.component_product_id,
                    parseInt(e.target.value) || 1,
                  )
                }
                disabled={isSubmitting}
                className="w-14 px-2 py-1 border border-blue-300 rounded text-center"
                aria-label="Cantidad"
              />
              <span className="w-20 text-right font-medium text-blue-800">
                S/ {(c.unit_cost * c.quantity).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(c.component_product_id)}
                disabled={isSubmitting}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                aria-label="Quitar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-dashed border-blue-200 pt-2 mt-1">
            <span className="text-sm font-semibold text-blue-900">
              Costo de fabricación (suma)
            </span>
            <span className="text-lg font-bold text-blue-900">
              S/ {total.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-blue-700 bg-white border border-blue-200 rounded-lg p-3">
          Agrega los productos que forman el combo. El costo se calcula sumando
          el costo de cada uno.
        </p>
      )}
    </>
  );
}
