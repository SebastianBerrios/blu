interface LedgerEntry {
  hours: number;
  description: string;
  created_at: string;
}

interface LedgerListProps {
  entries: LedgerEntry[];
}

export default function LedgerList({ entries }: LedgerListProps) {
  if (entries.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Sin movimientos
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry, i) => (
        <div key={i} className="px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">
              {entry.description}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(entry.created_at).toLocaleDateString("es-PE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`text-sm font-semibold ml-3 ${
              entry.hours > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {entry.hours > 0 ? "+" : ""}
            {entry.hours}h
          </span>
        </div>
      ))}
    </div>
  );
}
