"use client";

interface PurchaseTotalDisplayProps {
  total: number;
  plinChange: string;
  showPlinBreakdown: boolean;
}

export default function PurchaseTotalDisplay({
  total,
  plinChange,
  showPlinBreakdown,
}: PurchaseTotalDisplayProps) {
  const plinAmount = parseFloat(plinChange) || 0;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      {showPlinBreakdown && plinAmount > 0 ? (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Total compra:</span>
            <span className="font-medium">S/ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-700">
            <span>Caja descuenta:</span>
            <span className="font-medium">S/ {(total + plinAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-blue-700">
            <span>Banco recibe (vuelto Plin):</span>
            <span className="font-medium">S/ {plinAmount.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <span className="text-sm text-green-700">Total de la compra:</span>
          <span className="ml-2 font-bold text-green-800 text-lg">
            S/ {total.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
