"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import type { Category, Product, SaleWithProducts, PaymentMethod } from "@/types";
import type { LoyaltyReward, SaleProductLine } from "@/features/ventas/types";
import { createSale, updateSale } from "@/features/ventas";
import {
  applyLoyaltyReward,
  removeLoyaltyReward,
} from "@/features/ventas/utils/loyaltyUtils";
import ProductSelector from "@/features/ventas/components/ProductSelector";
import PaymentSection from "@/features/ventas/components/PaymentSection";
import LoyaltyRewardsSection from "@/features/ventas/components/LoyaltyRewardsSection";
import DiscountSection from "@/features/ventas/components/DiscountSection";
import SaleOrderHeader from "@/features/ventas/components/SaleOrderHeader";
import SaleFormShell from "@/features/ventas/components/SaleFormShell";
import { useSaleDiscount } from "@/features/ventas/hooks/useSaleDiscount";
import { useSaleFormInit } from "@/features/ventas/hooks/useSaleFormInit";

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
  const { user, profile, isAdmin } = useAuth();
  const { cajaAccount, bancoAccount, rappiAccount, posAccount } = useAccounts();

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
  const [notes, setNotes] = useState("");

  const discount = useSaleDiscount(saleProducts, setSaleProducts);

  useSaleFormInit(isOpen, sale, products, {
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
    initTotalDiscount: discount.initTotalDiscount,
    resetTotalDiscount: discount.resetTotalDiscount,
  });

  const totalPrice = saleProducts.reduce((sum, p) => sum + p.subtotal, 0);
  const netPayable = discount.netPayable;
  const discountAmount = discount.discountAmount;
  const isRappi = orderType === "Rappi";
  const title = isEditMode ? "Editar Venta" : "Registrar Venta";
  const submitLabel = isSubmitting
    ? "Guardando..."
    : isEditMode
      ? "Actualizar"
      : "Registrar venta";

  if (!isOpen) return null;

  const handleAddProduct = (line: SaleProductLine) => {
    const match = (p: SaleProductLine) =>
      p.status !== "Entregado" &&
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
    setSaleProducts((prev) => {
      if (prev[index]?.status === "Entregado" && !isAdmin) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleApplyReward = (index: number, reward: LoyaltyReward) => {
    setSaleProducts((prev) => {
      if (prev[index]?.status === "Entregado") return prev;
      return applyLoyaltyReward(prev, index, reward);
    });
  };

  const handleRemoveReward = (index: number) => {
    setSaleProducts((prev) => {
      if (prev[index]?.status === "Entregado") return prev;
      return removeLoyaltyReward(prev, index, products);
    });
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setCashAmount("");
    setPlinAmount("");
    setCashReceived("");
  };

  const handleOrderTypeChange = (value: string) => {
    setOrderType(value);
    if (value === "Rappi") {
      setRegisterPayment(true);
      setPaymentMethod("Rappi");
      setCashAmount("");
      setPlinAmount("");
      setCashReceived("");
      setTableNumber("");
    } else if (paymentMethod === "Rappi") {
      setPaymentMethod("Efectivo");
    }
  };

  const handleSubmit = async () => {
    if (saleProducts.length === 0) {
      setSubmitError(
        "La venta debe tener al menos un producto. Para vaciarla, elimina la venta.",
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const params = {
        orderType, tableNumber, customerDni, saleProducts, totalPrice,
        discountAmount,
        registerPayment, paymentMethod, cashAmount, plinAmount, cashReceived,
        notes,
        userId: user?.id ?? null,
        userName: profile?.full_name ?? null,
        cajaAccountId: cajaAccount?.id ?? null,
        bancoAccountId: bancoAccount?.id ?? null,
        rappiAccountId: rappiAccount?.id ?? null,
        posAccountId: posAccount?.id ?? null,
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

  return (
    <SaleFormShell
      title={title}
      onClose={onClose}
      isSubmitting={isSubmitting}
      submitDisabled={isSubmitting || saleProducts.length === 0}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
    >
      <SaleOrderHeader
        orderType={orderType}
        onOrderTypeChange={handleOrderTypeChange}
        tableNumber={tableNumber}
        onTableNumberChange={setTableNumber}
        customerDni={customerDni}
        onCustomerDniChange={setCustomerDni}
        isSubmitting={isSubmitting}
      />
      <ProductSelector
        products={products}
        saleProducts={saleProducts}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        totalPrice={totalPrice}
        isSubmitting={isSubmitting}
        isRappi={isRappi}
        canRemoveDelivered={isAdmin}
        onSetLineDiscount={discount.setLineDiscount}
      />
      <LoyaltyRewardsSection
        saleProducts={saleProducts}
        categories={categories}
        onApplyReward={handleApplyReward}
        onRemoveReward={handleRemoveReward}
        isSubmitting={isSubmitting}
      />
      {saleProducts.length > 0 && (
        <DiscountSection
          grossTotal={totalPrice}
          discountAmount={discountAmount}
          netPayable={netPayable}
          totalDiscountMode={discount.totalDiscountMode}
          totalDiscountValue={discount.totalDiscountValue}
          onModeChange={discount.setTotalDiscountMode}
          onValueChange={discount.setTotalDiscountValue}
          isSubmitting={isSubmitting}
        />
      )}
      {(!isRappi || isAdmin) && (
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
          totalPrice={netPayable}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          existingPaymentMethod={sale?.payment_method}
          isRappi={isRappi}
        />
      )}
      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          Nota del pedido{" "}
          <span className="text-slate-500 text-xs">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          rows={2}
          maxLength={500}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 resize-none"
          placeholder="Ej: Croissant sin mayonesa, Mojito sin hielo..."
        />
      </div>
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}
    </SaleFormShell>
  );
}
