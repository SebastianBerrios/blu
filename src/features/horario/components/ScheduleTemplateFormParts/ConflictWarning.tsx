import { AlertTriangle } from "lucide-react";
import { DAY_LABELS } from "@/types/schedule";
import type { DayOfWeek } from "@/types";

interface ConflictWarningProps {
  isAllUsers: boolean;
  conflictsByUser: Map<string, DayOfWeek[]>;
  employeeName: string;
  conflictingDays: DayOfWeek[];
}

export default function ConflictWarning({
  isAllUsers,
  conflictsByUser,
  employeeName,
  conflictingDays,
}: ConflictWarningProps) {
  return (
    <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        {isAllUsers ? (
          <>
            <p className="font-medium text-amber-800">
              Conflictos encontrados:
            </p>
            <ul className="text-amber-700 mt-0.5 space-y-0.5">
              {Array.from(conflictsByUser.entries()).map(([name, days]) => (
                <li key={name}>
                  {name}: {days.map((d) => DAY_LABELS[d]).join(", ")}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="font-medium text-amber-800">
              {employeeName} ya tiene turno en:
            </p>
            <p className="text-amber-700 mt-0.5">
              {conflictingDays.map((d) => DAY_LABELS[d]).join(", ")}
            </p>
          </>
        )}
        <p className="text-amber-600 mt-1">
          Al continuar se reemplazarán los turnos existentes.
        </p>
      </div>
    </div>
  );
}
