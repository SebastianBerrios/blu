import Button from "@/components/ui/Button";
import { FolderOpen } from "lucide-react";

export default function Categories() {
  return (
    <div className="h-full flex flex-col bg-primary-50">
      <div className="bg-white border-b border-primary-200 px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-900">
                Categorías
              </h1>
              <p className="text-primary-700 mt-1">
                Gestiona las categorías de tu cafeteria
              </p>
            </div>
          </div>
          <Button variant="primary" icon={true}>
            Agregar categoría
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-auto bg-primary-50"></div>
    </div>
  );
}
