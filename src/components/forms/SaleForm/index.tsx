"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Product, SaleWithProducts, PaymentMethod } from "@/types";

interface SaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale?: SaleWithProducts;
  products: Product[];
}

interface SaleProductLine {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const ORDER_TYPES = [
  { value: "Mesa", label: "Mesa", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "Para llevar", label: "Para llevar", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "Delivery", label: "Delivery", color: "bg-green-100 text-green-700 border-green-300" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string }[] = [
  { value: "Efectivo", label: "Efectivo", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "Yape", label: "Yape", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "Efectivo + Yape", label: "Efectivo + Yape", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
];

export default function SaleForm({
  isOpen,
  onClose,
  onSuccess,
  sale,
  products,
}: SaleFormProps) {
  const isEditMode = !!sale;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState("Mesa");
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuantity, setProductQuantity] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saleProducts, setSaleProducts] = useState<SaleProductLine[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [customerDni, setCustomerDni] = useState("");
  const [registerPayment, setRegisterPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [yapeAmount, setYapeAmount] = useState("");

  const totalPrice = saleProducts.reduce((sum, p) => sum + p.subtotal, 0);

  useEffect(() => {
    if (isOpen) {
      if (sale) {
        setOrderType(sale.order_type);
        setTableNumber(sale.table_number ? String(sale.table_number) : "");
        setCustomerDni(sale.customer_dni ? String(sale.customer_dni) : "");
        setSaleProducts(
          sale.sale_products.map((sp) => ({
            product_id: sp.product_id,
            product_name: sp.product_name,
            quantity: sp.quantity,
            unit_price: sp.unit_price,
            subtotal: sp.quantity * sp.unit_price,
          }))
        );
        if (sale.payment_method) {
          setRegisterPayment(true);
          setPaymentMethod(sale.payment_method as PaymentMethod);
          setCashAmount(sale.cash_amount ? String(sale.cash_amount) : "");
          setYapeAmount(sale.yape_amount ? String(sale.yape_amount) : "");
        } else {
          setRegisterPayment(false);
          setPaymentMethod("Efectivo");
          setCashAmount("");
          setYapeAmount("");
        }
      } else {
        setOrderType("Mesa");
        setTableNumber("");
        setCustomerDni("");
        setSaleProducts([]);
        setRegisterPayment(false);
        setPaymentMethod("Efectivo");
        setCashAmount("");
        setYapeAmount("");
      }
      setSearchProduct("");
      setSelectedProductId(null);
      setProductQuantity("");
      setShowDropdown(false);
    }
  }, [isOpen, sale]);

  if (!isOpen) return null;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : null;

  const handleSelectProduct = (id: number, name: string) => {
    setSelectedProductId(id);
    setSearchProduct(name);
    setShowDropdown(false);
  };

  const handleAddProduct = () => {
    if (!selectedProductId || !productQuantity) {
      alert("Selecciona un producto e ingresa la cantidad");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const quantity = parseInt(productQuantity);
    if (quantity <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const existing = saleProducts.find((p) => p.product_id === selectedProductId);
    if (existing) {
      setSaleProducts(
        saleProducts.map((p) =>
          p.product_id === selectedProductId
            ? {
                ...p,
                quantity: p.quantity + quantity,
                subtotal: (p.quantity + quantity) * p.unit_price,
              }
            : p
        )
      );
    } else {
      setSaleProducts([
        ...saleProducts,
        {
          product_id: selectedProductId,
          product_name: product.name,
          quantity,
          unit_price: product.price,
          subtotal: quantity * product.price,
        },
      ]);
    }

    setSearchProduct("");
    setSelectedProductId(null);
    setProductQuantity("");
  };

  const handleRemoveProduct = (productId: number) => {
    setSaleProducts(saleProducts.filter((p) => p.product_id !== productId));
  };

  const handleSubmit = async () => {
    if (saleProducts.length === 0) {
      alert("Debes agregar al menos un producto");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Resolve customer_id from DNI
      let customerId: number | null = null;
      if (customerDni.trim()) {
        const dniNumber = parseInt(customerDni.trim());
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("dni", dniNumber)
          .single();

        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({ dni: dniNumber })
            .select("id")
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      const paymentFields = registerPayment
        ? {
            payment_method: paymentMethod,
            payment_date: sale?.payment_date ?? new Date().toISOString(),
            cash_amount:
              paymentMethod === "Efectivo"
                ? totalPrice
                : paymentMethod === "Efectivo + Yape"
                ? parseFloat(cashAmount)
                : null,
            yape_amount:
              paymentMethod === "Yape"
                ? totalPrice
                : paymentMethod === "Efectivo + Yape"
                ? parseFloat(yapeAmount)
                : null,
          }
        : {
            payment_method: null,
            payment_date: null,
            cash_amount: null,
            yape_amount: null,
          };

      if (registerPayment && paymentMethod === "Efectivo + Yape") {
        const cash = parseFloat(cashAmount);
        const yape = parseFloat(yapeAmount);
        if (isNaN(cash) || isNaN(yape) || cash < 0 || yape < 0) {
          alert("Ingresa montos válidos");
          setIsSubmitting(false);
          return;
        }
        if (Math.abs(cash + yape - totalPrice) > 0.01) {
          alert("Los montos deben sumar el total de la venta");
          setIsSubmitting(false);
          return;
        }
      }

      if (isEditMode && sale) {
        const { error } = await supabase
          .from("sales")
          .update({ order_type: orderType, total_price: totalPrice, customer_id: customerId, table_number: orderType === "Mesa" ? parseInt(tableNumber) || null : null, ...paymentFields })
          .eq("id", sale.id);

        if (error) throw error;

        await supabase.from("sale_products").delete().eq("sale_id", sale.id);

        const { error: productsError } = await supabase
          .from("sale_products")
          .insert(
            saleProducts.map((p) => ({
              sale_id: sale.id,
              product_id: p.product_id,
              quantity: p.quantity,
              unit_price: p.unit_price,
            }))
          );

        if (productsError) throw productsError;
      } else {
        const { data: newSale, error } = await supabase
          .from("sales")
          .insert({
            order_type: orderType,
            total_price: totalPrice,
            customer_id: customerId,
            table_number: orderType === "Mesa" ? parseInt(tableNumber) || null : null,
            ...paymentFields,
          })
          .select()
          .single();

        if (error) throw error;

        const { error: productsError } = await supabase
          .from("sale_products")
          .insert(
            saleProducts.map((p) => ({
              sale_id: newSale.id,
              product_id: p.product_id,
              quantity: p.quantity,
              unit_price: p.unit_price,
            }))
          );

        if (productsError) throw productsError;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar la venta:", error);
      alert("Ocurrió un error al guardar la venta");
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-50 rounded-t-xl sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-primary-900">
            {isEditMode ? "Editar Venta" : "Registrar Venta"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-primary-700" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tipo de pedido */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-2">
              Tipo de pedido <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              {ORDER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOrderType(type.value)}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all ${
                    orderType === type.value
                      ? `${type.color} border-current`
                      : "bg-white text-primary-600 border-primary-200 hover:bg-primary-50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numero de mesa */}
          {orderType === "Mesa" && (
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1.5">
                Numero de mesa <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                placeholder="Ej: 1, 2, 3..."
              />
            </div>
          )}

          {/* DNI del cliente (opcional) */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">
              DNI del cliente <span className="text-primary-500 text-xs">(opcional)</span>
            </label>
            <input
              type="number"
              value={customerDni}
              onChange={(e) => setCustomerDni(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Ej: 12345678"
            />
          </div>

          {/* Buscar y agregar productos */}
          <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/50">
            <label className="block text-sm font-medium text-primary-900 mb-3">
              Agregar productos <span className="text-red-600">*</span>
            </label>

            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => {
                      setSearchProduct(e.target.value);
                      setSelectedProductId(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="Buscar producto..."
                  />

                  {showDropdown &&
                    searchProduct &&
                    !selectedProductId &&
                    filteredProducts.length > 0 && (
                      <ul className="absolute z-20 w-full mt-1 bg-white border border-primary-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts.map((product) => (
                          <li
                            key={product.id}
                            onClick={() =>
                              handleSelectProduct(product.id, product.name)
                            }
                            className="px-4 py-2.5 hover:bg-primary-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                          >
                            <span>{product.name}</span>
                            <span className="text-xs text-green-600 font-semibold">
                              S/ {product.price.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                {selectedProduct && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center whitespace-nowrap min-w-fit">
                    <span className="text-sm font-semibold text-green-700">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                    placeholder="Cantidad"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Lista de productos agregados */}
            {saleProducts.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-primary-900 mb-2">
                  Productos en la venta ({saleProducts.length})
                </h3>
                <div className="bg-white rounded-lg border border-primary-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-primary-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-primary-700 uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-primary-700 uppercase">
                          Cant.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-primary-700 uppercase">
                          P. Unit.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-primary-700 uppercase">
                          Subtotal
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-primary-700 uppercase">
                          Accion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-200">
                      {saleProducts.map((item) => (
                        <tr
                          key={item.product_id}
                          className="hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-sm text-primary-900 capitalize">
                            {item.product_name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-primary-900 text-center">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-primary-900 text-right">
                            S/ {item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-primary-900 text-right font-semibold">
                            <span className="text-green-600">
                              S/ {item.subtotal.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(item.product_id)}
                              disabled={isSubmitting}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold">
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-sm text-right text-green-900"
                        >
                          Total:
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-700">
                          S/ {totalPrice.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Registrar pago */}
          <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={registerPayment}
                onChange={(e) => setRegisterPayment(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-primary-900">
                Registrar pago {isEditMode && sale?.payment_method ? "" : "ahora"}
              </span>
            </label>

            {registerPayment && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-2">
                    Método de pago
                  </label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.value);
                          setCashAmount("");
                          setYapeAmount("");
                        }}
                        disabled={isSubmitting}
                        className={`flex-1 px-3 py-2.5 rounded-lg border-2 font-medium transition-all text-sm ${
                          paymentMethod === method.value
                            ? `${method.color} border-current`
                            : "bg-white text-primary-600 border-primary-200 hover:bg-primary-50"
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "Efectivo + Yape" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-primary-900 mb-1.5">
                        Efectivo
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 text-sm">S/</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashAmount}
                          onChange={(e) => {
                            setCashAmount(e.target.value);
                            const cash = parseFloat(e.target.value);
                            if (!isNaN(cash) && cash >= 0 && cash <= totalPrice) {
                              setYapeAmount((totalPrice - cash).toFixed(2));
                            }
                          }}
                          disabled={isSubmitting}
                          className="w-full pl-9 pr-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-900 mb-1.5">
                        Yape
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 text-sm">S/</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={yapeAmount}
                          onChange={(e) => {
                            setYapeAmount(e.target.value);
                            const yape = parseFloat(e.target.value);
                            if (!isNaN(yape) && yape >= 0 && yape <= totalPrice) {
                              setCashAmount((totalPrice - yape).toFixed(2));
                            }
                          }}
                          disabled={isSubmitting}
                          className="w-full pl-9 pr-4 py-2.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <span className="text-sm text-green-700">Total en {paymentMethod}:</span>
                    <span className="ml-2 font-bold text-green-800">
                      S/ {totalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones de accion */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border-2 border-primary-300 text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || saleProducts.length === 0}
              className="flex-1 px-4 py-2.5 bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditMode
                ? "Actualizar"
                : "Registrar venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
