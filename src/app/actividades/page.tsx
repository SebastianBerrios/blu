"use client";

import { useState, useMemo, useCallback } from "react";
import { ClipboardCheck, CheckSquare, Settings, History, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivities } from "@/hooks/useActivities";
import type { EmployeeTaskWithUser, TodayTask } from "@/types";
import { createTask, updateTask, deleteTask, toggleTaskCompletion } from "@/features/actividades";
import PageHeader from "@/components/ui/PageHeader";
import FAB from "@/components/ui/FAB";
import EmployeeTaskList from "@/features/actividades/components/EmployeeTaskList";
import TodayTab from "@/features/actividades/components/TodayTab";
import ManagementTab from "@/features/actividades/components/ManagementTab";
import TaskDefinitionForm from "@/features/actividades/components/TaskDefinitionForm";
import HistoryTab from "@/features/actividades/components/HistoryTab";

type TabId = "hoy" | "gestion" | "historial";

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function ActividadesPage() {
  const { user, isAdmin, profile } = useAuth();
  const { myTasks, allEmployeeTasks, users, isLoading, mutate } = useActivities();
  const [activeTab, setActiveTab] = useState<TabId>(isAdmin ? "hoy" : "hoy");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTaskWithUser | undefined>();

  // All tasks for management (fetch separately with user info)
  const allTasksWithUser = useMemo((): EmployeeTaskWithUser[] => {
    return allEmployeeTasks.flatMap((emp) =>
      emp.tasks.map((t) => ({
        ...t,
        user_name: emp.user_name,
        user_role: emp.user_role,
      }))
    );
  }, [allEmployeeTasks]);

  const handleToggle = useCallback(async (task: TodayTask) => {
    if (!user) return;
    const today = getTodayStr();

    // Optimistic update
    mutate(
      (prev) => {
        if (!prev) return prev;
        const toggleInList = (tasks: TodayTask[]) =>
          tasks.map((t) =>
            t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
          );

        return {
          ...prev,
          myTasks: toggleInList(prev.myTasks),
          allEmployeeTasks: prev.allEmployeeTasks.map((emp) => {
            if (emp.user_id !== task.user_id) return emp;
            const updated = toggleInList(emp.tasks);
            return {
              ...emp,
              tasks: updated,
              completed_count: updated.filter((t) => t.is_completed).length,
            };
          }),
        };
      },
      { revalidate: false }
    );

    try {
      await toggleTaskCompletion({
        taskId: task.id,
        userId: user.id,
        date: today,
        isCompleted: task.is_completed,
      });
    } catch (err) {
      console.error("Error al cambiar estado de tarea:", err);
      mutate(); // Revert on error
    }
  }, [user, mutate]);

  const handleFormSubmit = useCallback(async (data: {
    user_id: string;
    title: string;
    category: string;
    frequency: string;
    days_of_week: number[] | null;
    sort_order: number;
  }) => {
    if (editingTask) {
      await updateTask(
        editingTask.id,
        {
          title: data.title,
          category: data.category as "apertura" | "jornada" | "cierre",
          frequency: data.frequency as "daily" | "weekly",
          days_of_week: data.days_of_week,
          sort_order: data.sort_order,
        },
        user?.id ?? null,
        profile?.full_name ?? null
      );
    } else {
      await createTask(
        {
          user_id: data.user_id,
          title: data.title,
          category: data.category as "apertura" | "jornada" | "cierre",
          frequency: data.frequency as "daily" | "weekly",
          days_of_week: data.days_of_week,
          sort_order: data.sort_order,
        },
        user?.id ?? null,
        profile?.full_name ?? null
      );
    }
  }, [editingTask, user, profile]);

  const handleDelete = useCallback(async (task: EmployeeTaskWithUser) => {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    try {
      await deleteTask(task.id, user?.id ?? null, profile?.full_name ?? null, task.title);
      mutate();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  }, [user, profile, mutate]);

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
          {activeTab === "hoy" && (
            <TodayTab
              employees={allEmployeeTasks}
              isLoading={isLoading}
            />
          )}

          {activeTab === "gestion" && (
            <ManagementTab
              tasks={allTasksWithUser}
              users={users}
              isLoading={isLoading}
              onAdd={() => {
                setEditingTask(undefined);
                setShowForm(true);
              }}
              onEdit={(task) => {
                setEditingTask(task);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          )}

          {activeTab === "historial" && (
            <HistoryTab users={users} />
          )}
        </div>
      </section>

      {/* FAB for management tab */}
      {activeTab === "gestion" && (
        <FAB
          onClick={() => {
            setEditingTask(undefined);
            setShowForm(true);
          }}
          label="Agregar tarea"
        />
      )}

      {/* Task form modal */}
      <TaskDefinitionForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleSuccess}
        users={users}
        item={editingTask}
        onSubmit={handleFormSubmit}
      />
    </>
  );
}
