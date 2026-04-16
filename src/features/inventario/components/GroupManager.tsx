"use client";

import { useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { deleteGroup } from "../services/inventoryService";
import IngredientGroupForm from "./IngredientGroupForm";
import type { IngredientGroup } from "@/types";

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: IngredientGroup[];
  userId: string | null;
  userName: string | null;
  onSuccess: () => void;
}

export default function GroupManager({
  isOpen,
  onClose,
  groups,
  userId,
  userName,
  onSuccess,
}: GroupManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<IngredientGroup | undefined>();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleEdit = (group: IngredientGroup) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingGroup(undefined);
    setFormOpen(true);
  };

  const handleDelete = async (group: IngredientGroup) => {
    setDeleting(true);
    try {
      await deleteGroup(group.id, userId, userName, group.name);
      setConfirmingDeleteId(null);
      onSuccess();
    } catch (err) {
      console.error("Error al eliminar grupo:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    onSuccess();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Grupos de Ingredientes</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No hay grupos creados
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200"
                  >
                    <span className="font-medium text-slate-900">{group.name}</span>
                    {confirmingDeleteId === group.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(group)}
                          disabled={deleting}
                          className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                        >
                          {deleting ? "..." : "Confirmar"}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleting}
                          className="text-xs text-slate-500 font-medium px-2 py-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(group)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(group.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-2 shrink-0">
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-primary-900 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar grupo
            </button>
          </div>
        </div>
      </div>

      <IngredientGroupForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        group={editingGroup}
      />
    </>
  );
}
