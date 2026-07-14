import type { Tables } from "./database";

// Base types from Supabase
export type Activity = Tables<"activities">;
export type ActivityAssignment = Tables<"activity_assignments">;
export type TaskCompletion = Tables<"task_completions">;

// Category union (shift phase)
export type TaskCategory = "apertura" | "jornada" | "cierre";

// Frequency union
//  - daily     : every working day (Mon–Sat)
//  - weekly    : specific weekdays (days_of_week)
//  - interval  : every N days from anchor_date (2 = interdiario, 3 = cada 3 días)
//  - on_demand : "según necesidad" — no schedule, shown in its own section
export type TaskFrequency = "daily" | "weekly" | "interval" | "on_demand";

export interface Assignee {
  id: string;
  name: string;
  role: string | null;
}

// Catalog entry enriched with its assignees (admin management view)
export interface ActivityWithAssignees extends Activity {
  assignees: Assignee[];
}

// Activity + completion status for a given user's today view
export interface TodayTask extends Activity {
  // The assignee this task instance belongs to (a shared activity yields one
  // instance per assigned user).
  assignee_id: string;
  is_completed: boolean;
  completion_id: number | null;
  // Whether this activity is assigned to more than one person.
  shared: boolean;
}

// Grouped tasks by employee (admin today view). Counts exclude on_demand.
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

// Create/update payloads (assignments handled atomically via RPC)
export interface CreateActivity {
  title: string;
  description?: string | null;
  category: TaskCategory;
  frequency: TaskFrequency;
  days_of_week?: number[] | null;
  interval_days?: number | null;
  anchor_date?: string | null;
  sort_order?: number;
  assignee_ids: string[];
}

export interface UpdateActivity extends CreateActivity {
  id: number;
}
