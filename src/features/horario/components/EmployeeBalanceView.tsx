import LedgerList from "./LedgerList";

interface EmployeeBalanceViewProps {
  balance: number;
  entries: {
    hours: number;
    description: string;
    created_at: string;
    user_name?: string | null;
  }[];
}

export default function EmployeeBalanceView({
  balance,
  entries,
}: EmployeeBalanceViewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">Tu saldo disponible</p>
        <p className="text-4xl font-bold text-primary-700">{balance}</p>
        <p className="text-sm text-slate-500">horas</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-700">
            Tu historial
          </h4>
        </div>
        <LedgerList entries={entries} />
      </div>
    </div>
  );
}
