import { FileText } from "lucide-react";
import type { TimeOffRequestWithUser } from "@/types";
import Spinner from "@/components/ui/Spinner";
import RequestCard from "./RequestCard";

interface RequestsTabProps {
  requests: TimeOffRequestWithUser[];
  isLoading: boolean;
  isAdmin: boolean;
  onReview: (request: TimeOffRequestWithUser) => void;
}

export default function RequestsTab({
  requests,
  isLoading,
  isAdmin,
  onReview,
}: RequestsTabProps) {
  return (
    <div className="p-4 md:p-6">
      {isLoading ? (
        <Spinner text="Cargando solicitudes..." />
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Sin solicitudes</p>
          <p className="text-sm mt-1">
            {isAdmin
              ? "No hay solicitudes de permisos"
              : "Puedes solicitar un permiso usando el botón +"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              isAdmin={isAdmin}
              onReview={() => onReview(req)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
