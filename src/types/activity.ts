import type { Tables } from "./database";

// Base types from Supabase
export type EmployeeTask = Tables<"employee_tasks">;
export type TaskCompletion = Tables<"task_completions">;

// Category union
export type TaskCategory = "apertura" | "jornada" | "cierre";

// Frequency union
export type TaskFrequency = "daily" | "weekly";

// Extended task with user info (for admin views)
export interface EmployeeTaskWithUser extends EmployeeTask {
  user_name: string | null;
  user_role: string | null;
}

// Task + completion status for today's view
export interface TodayTask extends EmployeeTask {
  is_completed: boolean;
  completion_id: number | null;
}

// Grouped tasks by employee (for admin today view)
export interface EmployeeTodayTasks {
  user_id: string;
  user_name: string;
  user_role: string;
  tasks: TodayTask[];
  completed_count: number;
  total_count: number;
}

// For history view
export interface DayCompletionSummary {
  date: string;
  user_id: string;
  user_name: string;
  total_tasks: number;
  completed_tasks: number;
}

// Create/update types
export interface CreateEmployeeTask {
  user_id: string;
  title: string;
  category: TaskCategory;
  frequency: TaskFrequency;
  days_of_week?: number[] | null;
  sort_order?: number;
}

export interface UpdateEmployeeTask {
  title?: string;
  category?: TaskCategory;
  frequency?: TaskFrequency;
  days_of_week?: number[] | null;
  sort_order?: number;
  is_active?: boolean;
}
