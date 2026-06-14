"use client";

import { useEffect, useState } from "react";
import { X, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { registerPaymentWithRewards } from "@/features/ventas";
import {
  applyLoyaltyReward,
  removeLoyaltyReward,
} from "@/features/ventas/utils/loyaltyUtils";
import type {
  Category,
  PaymentMethod,
  Product,
  SaleWithProducts,
} from "@/types";
import type {
  DiscountMode,
  LoyaltyReward,
  SaleProductLine,
} from "@/features/ventas/types";
import LoyaltyRewardsSection from "@/features/ventas/components/LoyaltyRewardsSection";
import DiscountSection from "@/features/ventas/components/DiscountSection";
import LineDiscountInput from "@/features/ventas/components/LineDiscountInput";
import { useSaleDiscount } from "@/features/ventas/hooks/useSaleDiscount";
import { resolveLineDiscount, round2 } from "@/features/ventas/utils/discount";
import { PAYMENT_TONE, badgeClassName } from "@/components/ui/Badge";
import { POS_COMMISSION_RATE } from "@/features/ventas/constants";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleWithProducts;
  products: Product[];
  categories: Category[];
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string }[] = [
  { value: "Efectivo", label: "Efectivo", color: badgeClassName(PAYMENT_TONE.Efectivo) },
  { value: "Plin", label: "Plin", color: badgeClassName(PAYMENT_TONE.Plin) },
  {
    value: "Efectivo + Plin",
    label: "Efectivo + Plin",
    color: badgeClassName(PAYMENT_TONE["Efectivo + Plin"]),
  },
  { value: "POS", label: "POS", color: badgeClassName(PAYMENT_TONE.POS) },
];

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  sale,
  products,
  categories,
}: PaymentModalProps) {
  const { user, profile } = useAuth();
  const {
    cajaAccount,
    bancoAccount,
    rappiAccount,
    posAccount,
    isLoading: accountsLoading,
  } = useAccounts();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [plinAmount, setPlinAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saleProducts, setSaleProducts] = useState<SaleProductLine[]>([]);

  const discount = useSaleDiscount(saleProducts, setSaleProducts);

  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod("Efectivo");
    setCashAmount("");
    setPlinAmount("");
    setCashReceived("");
    setSubmitError(null);
    setSaleProducts(
      sale.sale_products.map((sp) => {
        const product = products.find((p) => p.id === sp.product_id);
        return {
          product_id: sp.product_id,
          product_name: sp.product_name,
          quantity: sp.quantity,
          unit_price: sp.unit_price,
          subtotal: sp.quantity * sp.unit_price,
          temperatura: sp.temperatura,
          tipo_leche: sp.tipo_leche,
          status: sp.status,
          category_id: product?.category_id ?? null,
          loyalty_reward:
            sp.loyalty_reward === "50_postre" ||
            sp.loyalty_reward === "bebida_gratis"
              ? sp.loyalty_reward
              : null,
          discount_amount: sp.discount_amount ?? 0,
          discount_mode:
            (sp.discount_amount ?? 0) > 0 ? ("monto" as const) : undefined,
          discount_value:
            (sp.discount_amount ?? 0) > 0 ? sp.discount_amount : undefined,
        };
      }),
    );
    const lineDiscountSum = sale.sale_products.reduce(
      (s, sp) => s + (sp.discount_amount ?? 0),
      0,
    );
    const totalLevelDiscount = round2(
      (sale.discount_amount ?? 0) - lineDiscountSum,
    );
    discount.initTotalDiscount(totalLevelDiscount > 0 ? totalLevelDiscount : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale, products]);

  if (!isOpen) return null;

  const grossTotal = saleProducts.reduce((sum, p) => sum + p.subtotal, 0);
  const discountAmount = discount.discountAmount;
  const totalPrice = discount.netPayable;
  const isMixed = paymentMethod === "Efectivo + Plin";
  const showCashReceived =
    paymentMethod === "Efectivo" || paymentMethod === "Efectivo + Plin";
  const effectiveCash =
    paymentMethod === "Efectivo"
      ? totalPrice
      : isMixed
        ? parseFloat(cashAmount) || 0
        : 0;
  const receivedNum = cashReceived ? parseFloat(cashReceived) : effectiveCash;
  const change =
    isFinite(receivedNum) && receivedNum > effectiveCash
      ? receivedNum - effectiveCash
      : 0;

  const handleCashChange = (value: string) => {
    setCashAmount(value);
    const cash = parseFloat(value);
    if (!isNaN(cash) && cash >= 0 && cash <= totalPrice) {
      setPlinAmount((totalPrice - cash).toFixed(2));
    }
  };

  const handlePlinChange = (value: string) => {
    setPlinAmount(value);
    const plin = parseFloat(value);
    if (!isNaN(plin) && plin >= 0 && plin <= totalPrice) {
      setCashAmount((totalPrice - plin).toFixed(2));
    }
  };

  const handleApplyReward = (index: number, reward: LoyaltyReward) => {
    setSaleProducts((prev) => applyLoyaltyReward(prev, index, reward));
  };

  const handleRemoveReward = (index: number) => {
    setSaleProducts((prev) => removeLoyaltyReward(prev, index, products));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await registerPaymentWithRewards({
        saleId: sale.id,
        saleProducts,
        newTotalPrice: grossTotal,
        discountAmount,
        paymentMethod,
        cashAmount,
        plinAmount,
        cashReceived,
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        cajaAccountId: cajaAccount?.id ?? null,
        bancoAccountId: bancoAccount?.id ?? null,
        rappiAccountId: rappiAccount?.id ?? null,
        posAccountId: posAccount?.id ?? null,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Registrar Pago
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Resumen de la venta */}
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-slate-700">
              <span className="font-medium">{sale.order_type}</span>
              <span className="mx-2">·</span>
              <span>{saleProducts.length} producto{saleProducts.length !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-xl font-bold text-slate-900">
              S/ {totalPrice.toFixed(2)}
            </span>
          </div>

          {/* Promociones de fidelidad */}
          <LoyaltyRewardsSection
            saleProducts={saleProducts}
            categories={categories}
            onApplyReward={handleApplyReward}
            onRemoveReward={handleRemoveReward}
            isSubmitting={isSubmitting}
          />

          {/* Descuentos por producto */}
          {saleProducts.length > 0 && (
            <div className="space-y-2">
              {saleProducts.map((item, idx) => {
                const lineDiscount = resolveLineDiscount(item);
                const lineNet = round2(item.subtotal - lineDiscount);
                return (
                  <div
                    key={`${item.product_id}-${item.temperatura}-${item.tipo_leche}-${item.loyalty_reward ?? "none"}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 capitalize truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × S/ {item.unit_price.toFixed(2)}
                        {lineDiscount > 0 && (
                          <span className="ml-1 text-green-700">
                            → S/ {lineNet.toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>
                    <LineDiscountInput
                      mode={item.discount_mode ?? "monto"}
                      value={item.discount_value}
                      onChange={(mode, value) =>
                        discount.setLineDiscount(idx, mode as DiscountMode, value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Descuento total + resumen */}
          {saleProducts.length > 0 && (
            <DiscountSection
              grossTotal={grossTotal}
              discountAmount={discountAmount}
              netPayable={totalPrice}
              totalDiscountMode={discount.totalDiscountMode}
              totalDiscountValue={discount.totalDiscountValue}
              onModeChange={discount.setTotalDiscountMode}
              onValueChange={discount.setTotalDiscountValue}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.value);
                    setCashAmount("");
                    setPlinAmount("");
                    setCashReceived("");
                  }}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all text-sm ${
                    paymentMethod === method.value
                      ? `${method.color} border-current`
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Montos */}
          {isMixed ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Monto en efectivo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5">
                  Monto en Plin
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plinAmount}
                    onChange={(e) => handlePlinChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ) : paymentMethod === "POS" ? (
            (() => {
              const commission = Number(
                (totalPrice * POS_COMMISSION_RATE).toFixed(2),
              );
              const net = Number((totalPrice - commission).toFixed(2));
              return (
                <div className="border-2 border-indigo-300 rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-indigo-700" />
                    <span className="text-sm font-semibold text-indigo-900">
                      Pago con POS
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-white border border-indigo-200 rounded-lg p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-indigo-700">
                        Subtotal
                      </p>
                      <p className="font-bold text-indigo-900 tabular-nums">
                        S/ {totalPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white border border-indigo-200 rounded-lg p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-indigo-700">
                        Comisión 3.44%
                      </p>
                      <p className="font-bold text-red-600 tabular-nums">
                        − S/ {commission.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-indigo-600 border border-indigo-700 rounded-lg p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-indigo-100">
                        Neto a recibir
                      </p>
                      <p className="font-bold text-white tabular-nums">
                        S/ {net.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <span className="text-sm text-green-700">Monto total en {paymentMethod}:</span>
              <span className="block text-lg font-bold text-green-800 mt-1">
                S/ {totalPrice.toFixed(2)}
              </span>
            </div>
          )}

          {showCashReceived && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1.5">
                Efectivo recibido{" "}
                <span className="text-slate-500 text-xs">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  S/
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  placeholder={effectiveCash.toFixed(2)}
                />
              </div>
              {change > 0 && (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Vuelto: S/ {change.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {accountsLoading && (
            <p className="text-xs text-slate-500 text-center">
              Cargando cuentas…
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                saleProducts.length === 0 ||
                accountsLoading ||
                !cajaAccount ||
                !bancoAccount ||
                (paymentMethod === "POS" && !posAccount)
              }
              className="flex-1 px-4 py-3 min-h-[44px] bg-green-700 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
