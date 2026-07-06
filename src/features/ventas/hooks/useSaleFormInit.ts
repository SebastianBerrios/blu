import { useEffect } from "react";
import type { Product, SaleWithProducts, PaymentMethod } from "@/types";
import type { SaleProductLine } from "../types";
import { round2 } from "../utils/discount";

interface SaleFormState {
  setSubmitError: (v: string | null) => void;
  setOrderType: (v: string) => void;
  setTableNumber: (v: string) => void;
  setCustomerDni: (v: string) => void;
  setSaleProducts: (v: SaleProductLine[]) => void;
  setNotes: (v: string) => void;
  setRegisterPayment: (v: boolean) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setCashAmount: (v: string) => void;
  setPlinAmount: (v: string) => void;
  setCashReceived: (v: string) => void;
  initTotalDiscount: (v: number) => void;
  resetTotalDiscount: () => void;
}

/**
 * Populates SaleForm state when the form opens (create or edit mode).
 * Keeps the init logic out of the form component to stay under the 300 LOC limit.
 */
export function useSaleFormInit(
  isOpen: boolean,
  sale: SaleWithProducts | undefined,
  products: Product[],
  state: SaleFormState,
): void {
  const {
    setSubmitError,
    setOrderType,
    setTableNumber,
    setCustomerDni,
    setSaleProducts,
    setNotes,
    setRegisterPayment,
    setPaymentMethod,
    setCashAmount,
    setPlinAmount,
    setCashReceived,
    initTotalDiscount,
    resetTotalDiscount,
  } = state;

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);
    if (sale) {
      setOrderType(sale.order_type);
      setTableNumber(sale.table_number ? String(sale.table_number) : "");
      setCustomerDni(sale.customer_dni ? String(sale.customer_dni) : "");
      setSaleProducts(
        sale.sale_products.map((sp) => {
          const product = products.find((p) => p.id === sp.product_id);
          return {
            id: sp.id,
            product_id: sp.product_id,
            product_name: sp.product_name,
            quantity: sp.quantity,
            unit_price: sp.unit_price,
            unit_cost: product?.manufacturing_cost ?? 0,
            subtotal: sp.quantity * sp.unit_price,
            temperatura: sp.temperatura,
            tipo_leche: sp.tipo_leche,
            category_id: product?.category_id ?? null,
            loyalty_reward:
              sp.loyalty_reward === "50_postre" ||
              sp.loyalty_reward === "bebida_gratis"
                ? sp.loyalty_reward
                : null,
            status: sp.status,
            discount_amount: sp.discount_amount ?? 0,
            discount_mode:
              (sp.discount_amount ?? 0) > 0 ? ("monto" as const) : undefined,
            discount_value:
              (sp.discount_amount ?? 0) > 0 ? sp.discount_amount : undefined,
          };
        }),
      );
      // Total-level discount = sale.discount_amount − sum of per-line discounts.
      const lineDiscountSum = sale.sale_products.reduce(
        (s, sp) => s + (sp.discount_amount ?? 0),
        0,
      );
      const totalLevelDiscount = round2(
        (sale.discount_amount ?? 0) - lineDiscountSum,
      );
      initTotalDiscount(totalLevelDiscount > 0 ? totalLevelDiscount : 0);
      setNotes(sale.notes ?? "");
      if (sale.payment_method) {
        setRegisterPayment(true);
        setPaymentMethod(sale.payment_method as PaymentMethod);
        setCashAmount(sale.cash_amount ? String(sale.cash_amount) : "");
        setPlinAmount(sale.plin_amount ? String(sale.plin_amount) : "");
        setCashReceived(sale.cash_received ? String(sale.cash_received) : "");
      } else {
        setRegisterPayment(false);
        setPaymentMethod("Efectivo");
        setCashAmount("");
        setPlinAmount("");
        setCashReceived("");
      }
    } else {
      setOrderType("Mesa");
      setTableNumber("");
      setCustomerDni("");
      setSaleProducts([]);
      setRegisterPayment(false);
      setPaymentMethod("Efectivo");
      setCashAmount("");
      setPlinAmount("");
      setCashReceived("");
      setNotes("");
      resetTotalDiscount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale, products]);
}
