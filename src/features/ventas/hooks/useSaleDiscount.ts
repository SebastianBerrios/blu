import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DiscountMode, SaleProductLine } from "../types";
import { computeSaleDiscount } from "../utils/discount";

/**
 * Estado reutilizable de descuento de venta, compartido por
 * `SaleForm` y `PaymentModal`. Maneja el descuento de nivel total y expone
 * helpers para descuentos por línea. Los montos resueltos (S/) y el neto se
 * derivan vía `computeSaleDiscount`.
 */
export function useSaleDiscount(
  saleProducts: SaleProductLine[],
  setSaleProducts: Dispatch<SetStateAction<SaleProductLine[]>>,
) {
  const [totalDiscountMode, setTotalDiscountMode] =
    useState<DiscountMode>("monto");
  const [totalDiscountValue, setTotalDiscountValue] = useState("");

  const setLineDiscount = useCallback(
    (index: number, mode: DiscountMode, value: number) => {
      setSaleProducts((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                discount_mode: mode,
                discount_value:
                  Number.isFinite(value) && value > 0 ? value : undefined,
              }
            : p,
        ),
      );
    },
    [setSaleProducts],
  );

  const resetTotalDiscount = useCallback(() => {
    setTotalDiscountMode("monto");
    setTotalDiscountValue("");
  }, []);

  /** Al editar: el descuento total guardado (S/) se re-muestra como monto fijo. */
  const initTotalDiscount = useCallback((amount: number) => {
    setTotalDiscountMode("monto");
    setTotalDiscountValue(amount > 0 ? String(amount) : "");
  }, []);

  const totalLevel = useMemo(() => {
    const v = parseFloat(totalDiscountValue);
    return Number.isFinite(v) && v > 0
      ? { mode: totalDiscountMode, value: v }
      : null;
  }, [totalDiscountMode, totalDiscountValue]);

  const result = useMemo(
    () => computeSaleDiscount(saleProducts, totalLevel),
    [saleProducts, totalLevel],
  );

  return {
    totalDiscountMode,
    setTotalDiscountMode,
    totalDiscountValue,
    setTotalDiscountValue,
    setLineDiscount,
    resetTotalDiscount,
    initTotalDiscount,
    ...result,
  };
}
