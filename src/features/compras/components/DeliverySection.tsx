"use client";

interface DeliverySectionProps {
  hasDelivery: boolean;
  deliveryCost: string;
  onToggleDelivery: (value: boolean) => void;
  onChangeCost: (value: string) => void;
  isSubmitting: boolean;
}

export default function DeliverySection({
  hasDelivery,
  deliveryCost,
  onToggleDelivery,
  onChangeCost,
  isSubmitting,
}: DeliverySectionProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasDelivery}
          onChange={(e) => onToggleDelivery(e.target.checked)}
          disabled={isSubmitting}
          className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-slate-900">
          Tiene delivery
        </span>
      </label>

      {hasDelivery && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-slate-900 mb-1.5">
            Costo de delivery
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              S/
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={deliveryCost}
              onChange={(e) => onChangeCost(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </div>
  );
}
