import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleUser } from "@/types";
import { createExtraHoursEntry } from "@/features/horario";

interface ExtraHoursFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: ScheduleUser[];
}

export default function ExtraHoursForm({
  isOpen,
  onClose,
  onSuccess,
  users,
}: ExtraHoursFormProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [hours, setHours] = useState<number>(1);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      setUserId(users[0]?.id ?? "");
      setType("credit");
      setHours(1);
      setDescription("");
    }
  }, [isOpen, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!userId || hours <= 0 || !description.trim() || !user) return;
    setIsSubmitting(true);

    try {
      const selectedUser = users.find((u) => u.id === userId);
      await createExtraHoursEntry({
        userId,
        hours,
        type,
        description: description.trim(),
        adminId: user.id,
        adminName: profile?.full_name ?? null,
        employeeName: selectedUser?.full_name ?? "",
      });

      toast.success("Horas registradas");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al registrar horas extra:", error);
      const msg = error instanceof Error ? error.message : "Error al registrar horas extra";
      setSubmitError(msg);
      toast.error(msg);
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Registrar Horas Extra
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Empleado <span className="text-red-600">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Tipo
            </label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setType("credit")}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  type === "credit"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                + Horas a favor
              </button>
              <button
                type="button"
                onClick={() => setType("debit")}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-l border-slate-300 ${
                  type === "debit"
                    ? "bg-red-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                − Horas en contra
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Horas <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">
              Descripción <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Trabajó feriado 1 de mayo"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="flex-1 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
