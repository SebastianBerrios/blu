import { Tables } from "./database";

export type AppRole = "admin" | "cocinero" | "barista";

export type UserProfile = Tables<"user_profiles">;
