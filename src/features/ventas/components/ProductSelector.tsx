import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Product } from "@/types";
import type { SaleProductLine } from "../types";

interface ProductSelectorProps {
  products: Product[];
  saleProducts: SaleProductLine[];
  onAddProduct: (line: SaleProductLine) => void;
  onRemoveProduct: (index: number) => void;
  totalPrice: number;
  isSubmitting: boolean;
}

export default function ProductSelector({
  products,
  saleProducts,
  onAddProduct,
  onRemoveProduct,
  totalPrice,
  isSubmitting,
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
    product.name.toLowerCase().includes(searchProduct.toLowerCase()),
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

    onAddProduct({
      product_id: selectedProductId,
      product_name: product.name,
      quantity,
      unit_price: product.price,
      subtotal: quantity * product.price,
      temperatura: temp,
      tipo_leche: milk,
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
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      onClick={() =>
                        handleSelectProduct(product.id, product.name)
                      }
                      className="px-4 py-3.5 hover:bg-slate-100 cursor-pointer transition-colors capitalize flex justify-between items-center"
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
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center whitespace-nowrap min-w-fit">
              <span className="text-sm font-semibold text-green-700">
                S/ {selectedProduct.price.toFixed(2)}
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
            {saleProducts.map((item, idx) => (
              <div
                key={`${item.product_id}-${item.temperatura}-${item.tipo_leche}`}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize truncate">
                    {item.product_name}
                  </p>
                  {(item.temperatura || item.tipo_leche) && (
                    <div className="flex gap-1 mt-0.5">
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
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    {item.quantity} × S/ {item.unit_price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-sm font-semibold text-green-600">
                    S/ {item.subtotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveProduct(idx)}
                    disabled={isSubmitting}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
                {saleProducts.map((item, idx) => (
                  <tr
                    key={`${item.product_id}-${item.temperatura}-${item.tipo_leche}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                      {item.product_name}
                      {(item.temperatura || item.tipo_leche) && (
                        <div className="flex gap-1 mt-0.5">
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
                      <span className="text-green-600">
                        S/ {item.subtotal.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(idx)}
                        disabled={isSubmitting}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
  );
}
