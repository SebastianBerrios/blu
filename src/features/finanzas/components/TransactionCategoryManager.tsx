"use client";

import { useState } from "react";
import { X, Plus, Pencil, Check, Eye, EyeOff, Tags } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionCategories } from "@/hooks/useTransactionCategories";
import {
  createTransactionCategory,
  updateTransactionCategory,
  setTransactionCategoryActive,
} from "@/features/finanzas/services/transactionCategoriesService";
import type { TransactionCategory, TransactionCategoryKind } from "@/types";

interface TransactionCategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionCategoryManager({
  isOpen,
  onClose,
  onSuccess,
}: TransactionCategoryManagerProps) {
  const { user, profile } = useAuth();
  // Admin manages every category, including deactivated ones
  const { categories, isLoading, mutate } = useTransactionCategories({ includeInactive: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const actor = { userId: user?.id ?? null, userName: profile?.full_name ?? null };

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await mutate();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (name: string, kind: TransactionCategoryKind) =>
    run(() => createTransactionCategory({ name, kind }, actor));
  const handleRename = (id: number, name: string) =>
    run(() => updateTransactionCategory(id, { name }, actor));
  const handleToggle = (id: number, isActive: boolean) =>
    run(() => setTransactionCategoryActive(id, isActive, actor));

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary-700" />
            Categorías
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="p-6 overflow-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Cargando categorías...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KindSection
                title="Ingresos"
                kind="ingreso"
                accent="green"
                categories={categories.filter((c) => c.kind === "ingreso")}
                busy={busy}
                onCreate={handleCreate}
                onRename={handleRename}
                onToggle={handleToggle}
              />
              <KindSection
                title="Egresos"
                kind="egreso"
                accent="red"
                categories={categories.filter((c) => c.kind === "egreso")}
                busy={busy}
                onCreate={handleCreate}
                onRename={handleRename}
                onToggle={handleToggle}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KindSectionProps {
  title: string;
  kind: TransactionCategoryKind;
  accent: "green" | "red";
  categories: TransactionCategory[];
  busy: boolean;
  onCreate: (name: string, kind: TransactionCategoryKind) => void;
  onRename: (id: number, name: string) => void;
  onToggle: (id: number, isActive: boolean) => void;
}

function KindSection({
  title,
  kind,
  accent,
  categories,
  busy,
  onCreate,
  onRename,
  onToggle,
}: KindSectionProps) {
  const [newName, setNewName] = useState("");
  const chip =
    accent === "green" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name, kind);
    setNewName("");
  };

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold px-2 py-1 rounded-full inline-flex ${chip}`}>
        {title}
      </h3>

      <div className="space-y-1.5">
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">Sin categorías todavía</p>
        ) : (
          categories.map((c) => (
            <CategoryRow key={c.id} category={c} busy={busy} onRename={onRename} onToggle={onToggle} />
          ))
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNew()}
          disabled={busy}
          placeholder={`Nueva categoría de ${title.toLowerCase().slice(0, -1)}`}
          className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
        />
        <button
          type="button"
          onClick={submitNew}
          disabled={busy || !newName.trim()}
          className="px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>
    </div>
  );
}

interface CategoryRowProps {
  category: TransactionCategory;
  busy: boolean;
  onRename: (id: number, name: string) => void;
  onToggle: (id: number, isActive: boolean) => void;
}

function CategoryRow({ category, busy, onRename, onToggle }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) onRename(category.id, trimmed);
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        category.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"
      }`}
    >
      {editing ? (
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          disabled={busy}
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 truncate text-sm ${
            category.is_active ? "text-slate-700" : "text-slate-400 line-through"
          }`}
        >
          {category.name}
        </span>
      )}

      {editing ? (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="p-1.5 rounded-md text-green-700 hover:bg-green-50 transition-colors"
          title="Guardar"
        >
          <Check className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setName(category.name);
            setEditing(true);
          }}
          disabled={busy}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
          title="Renombrar"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onToggle(category.id, !category.is_active)}
        disabled={busy}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
        title={category.is_active ? "Desactivar" : "Reactivar"}
      >
        {category.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
