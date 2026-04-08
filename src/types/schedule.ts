import type { Tables } from "./database";

// Base types from Supabase
export type ScheduleTemplate = Tables<"schedule_templates">;
export type ScheduleOverride = Tables<"schedule_overrides">;
export type TimeOffRequest = Tables<"time_off_requests">;
export type ExtraHoursLog = Tables<"extra_hours_log">;

// Status union
export type TimeOffStatus = "pendiente" | "aprobado" | "rechazado";

// Day of week (0=Lunes...6=Domingo)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Lunes",
  1: "Martes",
  2: "Miércoles",
  3: "Jueves",
  4: "Viernes",
  5: "Sábado",
  6: "Domingo",
};

// Extended types with user info
export interface ScheduleTemplateWithUser extends ScheduleTemplate {
  user_name: string | null;
  user_role: string | null;
}

export interface TimeOffRequestWithUser extends TimeOffRequest {
  user_name: string | null;
  user_role: string | null;
  reviewer_name: string | null;
}

export interface ExtraHoursLogWithUser extends ExtraHoursLog {
  user_name: string | null;
  creator_name: string | null;
}

// For the merged weekly view
export interface ScheduleSlot {
  user_id: string;
  user_name: string;
  user_role: string;
  day_of_week: DayOfWeek;
  date: string;
  start_time: string;
  end_time: string;
  is_override: boolean;
  is_day_off: boolean;
  is_extra_shift?: boolean;
  is_absence?: boolean;
  override_reason?: string;
}

// Employee balance summary
export interface EmployeeBalance {
  user_id: string;
  user_name: string;
  user_role: string;
  total_credits: number;
  total_debits: number;
  balance: number;
}

// Active user for selects
export interface ScheduleUser {
  id: string;
  full_name: string | null;
  role: string | null;
}
