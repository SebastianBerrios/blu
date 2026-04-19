"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import type { Category, Product, SaleWithProducts, PaymentMethod } from "@/types";
import type { LoyaltyReward, SaleProductLine } from "@/features/ventas/types";
import { ORDER_TYPES } from "@/features/ventas/constants";
import { createSale, updateSale } from "@/features/ventas";
import {
  applyLoyaltyReward,
  removeLoyaltyReward,
} from "@/features/ventas/utils/loyaltyUtils";
import ProductSelector from "@/features/ventas/components/ProductSelector";
import PaymentSection from "@/features/ventas/components/PaymentSection";
import LoyaltyRewardsSection from "@/features/ventas/components/LoyaltyRewardsSection";

interface SaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale?: SaleWithProducts;
  products: Product[];
  categories: Category[];
}

export default function SaleForm({
  isOpen, onClose, onSuccess, sale, products, categories,
}: SaleFormProps) {
  const isEditMode = !!sale;
  const { user, profile } = useAuth();
  const { cajaAccount, bancoAccount } = useAccounts();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState("Mesa");
  const [tableNumber, setTableNumber] = useState("");
  const [customerDni, setCustomerDni] = useState("");
  const [saleProducts, setSaleProducts] = useState<SaleProductLine[]>([]);
  const [registerPayment, setRegisterPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [plinAmount, setPlinAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  const totalPrice = saleProducts.reduce((sum, p) => sum + p.subtotal, 0);
  const title = isEditMode ? "Editar Venta" : "Registrar Venta";
  const submitLabel = isSubmitting
    ? "Guardando..."
    : isEditMode
      ? "Actualizar"
      : "Registrar venta";

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
            product_id: sp.product_id,
            product_name: sp.product_name,
            quantity: sp.quantity,
            unit_price: sp.unit_price,
            subtotal: sp.quantity * sp.unit_price,
            temperatura: sp.temperatura,
            tipo_leche: sp.tipo_leche,
            category_id: product?.category_id ?? null,
            loyalty_reward:
              sp.loyalty_reward === "50_postre" ||
              sp.loyalty_reward === "bebida_gratis"
                ? sp.loyalty_reward
                : null,
          };
        }),
      );
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
    }
  }, [isOpen, sale, products]);

  if (!isOpen) return null;

  const handleAddProduct = (line: SaleProductLine) => {
    const match = (p: SaleProductLine) =>
      p.product_id === line.product_id &&
      p.temperatura === line.temperatura &&
      p.tipo_leche === line.tipo_leche &&
      !p.loyalty_reward;

    if (saleProducts.some(match)) {
      setSaleProducts(
        saleProducts.map((p) =>
          match(p)
            ? { ...p, quantity: p.quantity + line.quantity, subtotal: (p.quantity + line.quantity) * p.unit_price }
            : p,
        ),
      );
    } else {
      setSaleProducts([...saleProducts, line]);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSaleProducts(saleProducts.filter((_, i) => i !== index));
  };

  const handleApplyReward = (index: number, reward: LoyaltyReward) => {
    setSaleProducts((prev) => applyLoyaltyReward(prev, index, reward));
  };

  const handleRemoveReward = (index: number) => {
    setSaleProducts((prev) => removeLoyaltyReward(prev, index, products));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setCashAmount("");
    setPlinAmount("");
    setCashReceived("");
  };

  const handleSubmit = async () => {
    if (saleProducts.length === 0) {
      setSubmitError("Debes agregar al menos un producto");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const params = {
        orderType, tableNumber, customerDni, saleProducts, totalPrice,
        registerPayment, paymentMethod, cashAmount, plinAmount, cashReceived,
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        cajaAccountId: cajaAccount?.id ?? null,
        bancoAccountId: bancoAccount?.id ?? null,
        existingPaymentDate: sale?.payment_date,
      };
      if (isEditMode && sale) {
        await updateSale(sale.id, params);
      } else {
        await createSale(params);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error al guardar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Tipo de pedido <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-2">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setOrderType(type.value)}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 min-h-[44px] rounded-lg border-2 font-medium transition-all ${
                orderType === type.value
                  ? `${type.color} border-current`
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      {orderType === "Mesa" && (
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Numero de mesa <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="Ej: 1, 2, 3..."
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          DNI del cliente <span className="text-slate-500 text-xs">(opcional)</span>
        </label>
        <input
          type="number"
          value={customerDni}
          onChange={(e) => setCustomerDni(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
          placeholder="Ej: 12345678"
        />
      </div>
      <ProductSelector
        products={products}
        saleProducts={saleProducts}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        totalPrice={totalPrice}
        isSubmitting={isSubmitting}
      />
      <LoyaltyRewardsSection
        saleProducts={saleProducts}
        categories={categories}
        onApplyReward={handleApplyReward}
        onRemoveReward={handleRemoveReward}
        isSubmitting={isSubmitting}
      />
      <PaymentSection
        registerPayment={registerPayment}
        onRegisterPaymentChange={setRegisterPayment}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={handlePaymentMethodChange}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        plinAmount={plinAmount}
        setPlinAmount={setPlinAmount}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        totalPrice={totalPrice}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        existingPaymentMethod={sale?.payment_method}
      />
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}
    </>
  );

  const submitDisabled = isSubmitting || saleProducts.length === 0;

  return (
    <>
      {/* Mobile fullscreen */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="p-3 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="w-11" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{formFields}</div>
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="w-full px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      {/* Desktop modal */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden md:flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="p-3 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {formFields}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
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
                disabled={submitDisabled}
                className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
