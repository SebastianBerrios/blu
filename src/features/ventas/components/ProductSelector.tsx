import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Product } from "@/types";
import type { DiscountMode, SaleProductLine } from "../types";
import { RAPPI_SUGGESTED_PRICE_MULTIPLIER } from "../constants";
import { resolveLineDiscount, round2 } from "../utils/discount";
import LineDiscountInput from "./LineDiscountInput";
import { normalizeText } from "@/utils/helpers";

interface ProductSelectorProps {
  products: Product[];
  saleProducts: SaleProductLine[];
  onAddProduct: (line: SaleProductLine) => void;
  onRemoveProduct: (index: number) => void;
  totalPrice: number;
  isSubmitting: boolean;
  isRappi?: boolean;
  canRemoveDelivered?: boolean;
  isAdmin?: boolean;
  onSetLineDiscount?: (index: number, mode: DiscountMode, value: number) => void;
}

export function resolveProductPrice(product: Product, isRappi: boolean): number {
  if (!isRappi) return product.price;
  if (product.rappi_price && product.rappi_price > 0) return product.rappi_price;
  return Number((product.price * RAPPI_SUGGESTED_PRICE_MULTIPLIER).toFixed(2));
}

export default function ProductSelector({
  products,
  saleProducts,
  onAddProduct,
  onRemoveProduct,
  totalPrice,
  isSubmitting,
  isRappi = false,
  canRemoveDelivered = false,
  isAdmin = false,
  onSetLineDiscount,
}: ProductSelectorProps) {
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [productQuantity, setProductQuantity] = useState("1");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTemperatura, setSelectedTemperatura] = useState("");
  const [selectedTipoLeche, setSelectedTipoLeche] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const filteredProducts = products.filter((product) =>
    normalizeText(product.name).includes(normalizeText(searchProduct)),
  );

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : null;

  const handleSelectProduct = (id: number, name: string) => {
    setSelectedProductId(id);
    setSearchProduct(name);
    setShowDropdown(false);
    setSelectedTemperatura("");
    setSelectedTipoLeche("");
    setValidationError(null);
  };

  const handleAdd = () => {
    setValidationError(null);

    if (!selectedProductId || !productQuantity) {
      setValidationError("Selecciona un producto e ingresa la cantidad");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const quantity = parseInt(productQuantity);
    if (quantity <= 0) {
      setValidationError("La cantidad debe ser mayor a 0");
      return;
    }

    const needsTemp = product.temperatura === "ambos";
    const needsMilk = product.tipo_leche !== null;

    if (needsTemp && !selectedTemperatura) {
      setValidationError("Selecciona la temperatura");
      return;
    }
    if (needsMilk && !selectedTipoLeche) {
      setValidationError("Selecciona el tipo de leche");
      return;
    }

    const temp = needsTemp
      ? selectedTemperatura
      : product.temperatura === "caliente" || product.temperatura === "frío"
        ? product.temperatura
        : null;
    const milk = needsMilk ? selectedTipoLeche || "entera" : null;
    const unitPrice = resolveProductPrice(product, isRappi);

    onAddProduct({
      product_id: selectedProductId,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      subtotal: quantity * unitPrice,
      temperatura: temp,
      tipo_leche: milk,
      category_id: product.category_id,
      loyalty_reward: null,
    });

    setSearchProduct("");
    setSelectedProductId(null);
    setProductQuantity("1");
    setSelectedTemperatura("");
    setSelectedTipoLeche("");
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="block text-sm font-medium text-slate-900 mb-3">
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
                setValidationError(null);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="Buscar producto..."
            />

            {showDropdown &&
              searchProduct &&
              !selectedProductId &&
              filteredProducts.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const displayPrice = resolveProductPrice(product, isRappi);
                    return (
                      <li
                        key={product.id}
                        onClick={() =>
                          handleSelectProduct(product.id, product.name)
                        }
                        className="px-4 py-3.5 hover:bg-slate-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
                      >
                        <span>{product.name}</span>
                        <span
                          className={`text-xs font-semibold ${
                            isRappi ? "text-orange-600" : "text-green-600"
                          }`}
                        >
                          S/ {displayPrice.toFixed(2)}
                          {isRappi ? " Rappi" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>

          {selectedProduct && (
            <div
              className={`border rounded-lg px-4 py-3 flex items-center whitespace-nowrap min-w-fit ${
                isRappi
                  ? "bg-orange-50 border-orange-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  isRappi ? "text-orange-700" : "text-green-700"
                }`}
              >
                S/ {resolveProductPrice(selectedProduct, isRappi).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {selectedProduct && selectedProduct.temperatura === "ambos" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Temperatura
            </label>
            <div className="flex gap-2">
              {["caliente", "frío"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedTemperatura(opt)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedTemperatura === opt
                      ? "bg-amber-100 text-amber-700 border-amber-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt === "caliente" ? "Caliente" : "Frío"}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedProduct && selectedProduct.tipo_leche !== null && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tipo de leche
            </label>
            <div className="flex gap-2">
              {["entera", "deslactosada"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedTipoLeche(opt)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedTipoLeche === opt
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt === "entera" ? "Entera" : "Deslactosada"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              min="1"
              step="1"
              value={productQuantity}
              onChange={(e) => setProductQuantity(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              placeholder="Cantidad"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting}
            className="px-6 py-3 min-h-[44px] bg-primary-900 text-white rounded-lg hover:bg-primary-800 disabled:bg-gray-400 transition-colors font-medium"
          >
            Agregar
          </button>
        </div>

        {validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
      </div>

      {saleProducts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-900 mb-2">
            Productos en la venta ({saleProducts.length})
          </h3>

          {/* Mobile card list */}
          <div className="space-y-2 md:hidden">
            {saleProducts.map((item, idx) => {
              const locked = item.status === "Entregado";
              const showDiscount = isAdmin && !!onSetLineDiscount && !locked;
              const lineDiscount = resolveLineDiscount(item);
              const lineNet = round2(item.subtotal - lineDiscount);
              return (
              <div
                key={item.id ?? `${item.product_id}-${item.temperatura}-${item.tipo_leche}-${item.loyalty_reward ?? "none"}-${idx}`}
                className={`p-3 rounded-lg ${locked ? "bg-emerald-50/40" : "bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize truncate">
                      {item.product_name}
                    </p>
                    {(item.temperatura || item.tipo_leche || item.loyalty_reward || locked) && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {item.temperatura && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            {item.temperatura}
                          </span>
                        )}
                        {item.tipo_leche && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                            {item.tipo_leche}
                          </span>
                        )}
                        {item.loyalty_reward && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            {item.loyalty_reward === "50_postre" ? "50% desc." : "Gratis"}
                          </span>
                        )}
                        {locked && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Entregado
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      {item.quantity} × S/ {item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    {lineDiscount > 0 ? (
                      <span className="flex flex-col items-end leading-tight">
                        <span className="text-[10px] text-slate-400 line-through">
                          S/ {item.subtotal.toFixed(2)}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          S/ {lineNet.toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-green-600">
                        S/ {item.subtotal.toFixed(2)}
                      </span>
                    )}
                    {(!locked || canRemoveDelivered) && (
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(idx)}
                        disabled={isSubmitting}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {showDiscount && (
                  <div className="mt-2 flex justify-end">
                    <LineDiscountInput
                      mode={item.discount_mode ?? "monto"}
                      value={item.discount_value}
                      onChange={(mode, value) =>
                        onSetLineDiscount!(idx, mode, value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
              );
            })}
            {/* Mobile total */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg font-semibold">
              <span className="text-sm text-green-900">Total:</span>
              <span className="text-sm text-green-700">
                S/ {totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                    Cant.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                    P. Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-700 uppercase">
                    Subtotal
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-700 uppercase">
                    Accion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {saleProducts.map((item, idx) => {
                  const locked = item.status === "Entregado";
                  const showDiscount = isAdmin && !!onSetLineDiscount && !locked;
                  const lineDiscount = resolveLineDiscount(item);
                  const lineNet = round2(item.subtotal - lineDiscount);
                  return (
                  <tr
                    key={item.id ?? `${item.product_id}-${item.temperatura}-${item.tipo_leche}-${item.loyalty_reward ?? "none"}-${idx}`}
                    className={`transition-colors ${locked ? "bg-emerald-50/30" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                      {item.product_name}
                      {(item.temperatura || item.tipo_leche || item.loyalty_reward || locked) && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {item.temperatura && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                              {item.temperatura}
                            </span>
                          )}
                          {item.tipo_leche && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                              {item.tipo_leche}
                            </span>
                          )}
                          {item.loyalty_reward && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                              {item.loyalty_reward === "50_postre" ? "50% desc." : "Gratis"}
                            </span>
                          )}
                          {locked && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              Entregado
                            </span>
                          )}
                        </div>
                      )}
                      {showDiscount && (
                        <div className="mt-1.5">
                          <LineDiscountInput
                            mode={item.discount_mode ?? "monto"}
                            value={item.discount_value}
                            onChange={(mode, value) =>
                              onSetLineDiscount!(idx, mode, value)
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-center">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      S/ {item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-semibold">
                      {lineDiscount > 0 ? (
                        <span className="flex flex-col items-end leading-tight">
                          <span className="text-[10px] text-slate-400 line-through">
                            S/ {item.subtotal.toFixed(2)}
                          </span>
                          <span className="text-green-600">
                            S/ {lineNet.toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-green-600">
                          S/ {item.subtotal.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(!locked || canRemoveDelivered) && (
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(idx)}
                          disabled={isSubmitting}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
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
  );
}
