interface AssigneesFieldProps {
  users: { id: string; full_name: string | null; role: string | null }[];
  assigneeIds: string[];
  onToggleAssignee: (id: string) => void;
  isSubmitting: boolean;
}

export default function AssigneesField({
  users,
  assigneeIds,
  onToggleAssignee,
  isSubmitting,
}: AssigneesFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-1.5">
        Asignar a <span className="text-red-600">*</span>
      </label>
      <div className="flex gap-2 flex-wrap">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onToggleAssignee(u.id)}
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg border transition-colors ${
              assigneeIds.includes(u.id)
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white text-slate-600 border-slate-300 hover:border-primary-300"
            }`}
          >
            {u.full_name ?? u.id}
          </button>
        ))}
      </div>
      {assigneeIds.length > 1 && (
        <p className="text-[11px] text-sky-700 mt-1.5">
          Actividad compartida entre {assigneeIds.length} personas.
        </p>
      )}
    </div>
  );
}
