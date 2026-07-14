"use client";

import { useState, useCallback } from "react";
import { ClipboardCheck, CheckSquare, Settings, History, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { useActivities } from "@/hooks/useActivities";
import { toLocalDateKey } from "@/utils/helpers/groupByDate";
import type { ActivityWithAssignees, CreateActivity, TodayTask } from "@/types";
import { createActivity, updateActivity, deleteActivity, toggleTaskCompletion } from "@/features/actividades";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmployeeTaskList from "@/features/actividades/components/EmployeeTaskList";
import TodayTab from "@/features/actividades/components/TodayTab";
import ManagementTab from "@/features/actividades/components/ManagementTab";
import ActivityForm from "@/features/actividades/components/ActivityForm";
import HistoryTab from "@/features/actividades/components/HistoryTab";

type TabId = "hoy" | "gestion" | "historial";

// Use toLocalDateKey (browser-local TZ) instead of a raw Date constructor to
// avoid the latent TZ bug where UTC midnight could return yesterday's date.
function getTodayStr(): string {
  return toLocalDateKey(new Date().toISOString());
}

export default function ActividadesPage() {
  const { user, isAdmin, profile } = useAuth();
  const confirm = useConfirm();
  const { myTasks, allEmployeeTasks, catalog, users, isLoading, mutate } = useActivities();
  const [activeTab, setActiveTab] = useState<TabId>("hoy");

  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityWithAssignees | undefined>();

  const handleToggle = useCallback(
    async (task: TodayTask) => {
      if (!user) return;
      const today = getTodayStr();

      // Optimistic update — match by activity id AND the assignee it belongs to.
      mutate(
        (prev) => {
          if (!prev) return prev;
          const toggleInList = (tasks: TodayTask[]) =>
            tasks.map((t) =>
              t.id === task.id && t.assignee_id === task.assignee_id
                ? { ...t, is_completed: !t.is_completed }
                : t
            );

          return {
            ...prev,
            myTasks: toggleInList(prev.myTasks),
            allEmployeeTasks: prev.allEmployeeTasks.map((emp) => {
              if (emp.user_id !== task.assignee_id) return emp;
              const updated = toggleInList(emp.tasks);
              const scheduled = updated.filter((t) => t.frequency !== "on_demand");
              return {
                ...emp,
                tasks: updated,
                completed_count: scheduled.filter((t) => t.is_completed).length,
              };
            }),
          };
        },
        { revalidate: false }
      );

      try {
        await toggleTaskCompletion({
          activityId: task.id,
          userId: task.assignee_id,
          date: today,
          isCompleted: task.is_completed,
        });
      } catch (err) {
        console.error("Error al cambiar estado de tarea:", err);
        mutate(); // Revert on error
      }
    },
    [user, mutate]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateActivity) => {
      if (editingActivity) {
        await updateActivity(
          { ...data, id: editingActivity.id },
          user?.id ?? null,
          profile?.full_name ?? null
        );
      } else {
        await createActivity(data, user?.id ?? null, profile?.full_name ?? null);
      }
    },
    [editingActivity, user, profile]
  );

  const handleDelete = useCallback(
    async (activity: ActivityWithAssignees) => {
      const ok = await confirm({
        title: "¿Eliminar actividad?",
        description: `Se eliminará la actividad "${activity.title}".`,
        confirmLabel: "Eliminar",
        variant: "danger",
      });
      if (!ok) return;
      try {
        await deleteActivity(activity.id, user?.id ?? null, profile?.full_name ?? null, activity.title);
        mutate();
        toast.success("Actividad eliminada");
      } catch (err) {
        console.error("Error al eliminar actividad:", err);
        toast.error(err instanceof Error ? err.message : "Error al eliminar actividad");
      }
    },
    [confirm, user, profile, mutate]
  );

  const handleSuccess = () => {
    mutate();
  };

  // Employee view: single checklist
  if (!isAdmin) {
    return (
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Mis Actividades"
          subtitle="Tareas del día"
          icon={<ClipboardCheck className="w-6 h-6 text-primary-700" />}
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Sin tareas para hoy</p>
              <p className="text-sm mt-1">No tienes actividades asignadas para hoy</p>
            </div>
          ) : (
            <EmployeeTaskList tasks={myTasks} onToggle={handleToggle} />
          )}
        </div>
      </section>
    );
  }

  // Admin view: tabs
  return (
    <>
      <section className="h-full flex flex-col bg-slate-50">
        <PageHeader
          title="Actividades"
          subtitle="Gestiona las tareas del equipo"
          icon={<ClipboardCheck className="w-6 h-6 text-primary-700" />}
        />

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6">
          <div className="flex gap-1">
            {([
              { id: "hoy", label: "Hoy", icon: CheckSquare },
              { id: "gestion", label: "Gestión", icon: Settings },
              { id: "historial", label: "Historial", icon: History },
            ] satisfies { id: TabId; label: string; icon: LucideIcon }[]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === "hoy" && <TodayTab employees={allEmployeeTasks} isLoading={isLoading} />}

          {activeTab === "gestion" && (
            <ManagementTab
              catalog={catalog}
              users={users}
              isLoading={isLoading}
              onAdd={() => {
                setEditingActivity(undefined);
                setShowForm(true);
              }}
              onEdit={(activity) => {
                setEditingActivity(activity);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {activeTab === "historial" && <HistoryTab users={users} />}
        </div>
      </section>

      {/* FAB for management tab */}
      {activeTab === "gestion" && (
        <FAB
          onClick={() => {
            setEditingActivity(undefined);
            setShowForm(true);
          }}
          label="Agregar actividad"
        />
      )}

      {/* Activity form modal */}
      <ActivityForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleSuccess}
        users={users}
        item={editingActivity}
        onSubmit={handleFormSubmit}
      />
    </>
  );
}
