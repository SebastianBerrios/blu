import { ORDER_TYPES } from "../constants";

interface SaleOrderHeaderProps {
  orderType: string;
  onOrderTypeChange: (value: string) => void;
  tableNumber: string;
  onTableNumberChange: (value: string) => void;
  customerDni: string;
  onCustomerDniChange: (value: string) => void;
  isSubmitting: boolean;
}

/**
 * Order metadata fields for the sale form: order type selector, table number
 * (Mesa only), customer DNI, and notes. Purely presentational — all state lives
 * in SaleForm.
 */
export default function SaleOrderHeader({
  orderType,
  onOrderTypeChange,
  tableNumber,
  onTableNumberChange,
  customerDni,
  onCustomerDniChange,
  isSubmitting,
}: SaleOrderHeaderProps) {
  return (
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
              onClick={() => onOrderTypeChange(type.value)}
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
            Número de mesa <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={tableNumber}
            onChange={(e) => onTableNumberChange(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            placeholder="Ej: 1, 2, 3..."
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1.5">
          DNI del cliente{" "}
          <span className="text-slate-500 text-xs">(opcional)</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          value={customerDni}
          onChange={(e) => onCustomerDniChange(e.target.value.replace(/\D/g, ""))}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
          placeholder="Ej: 12345678"
        />
      </div>

    </>
  );
}
