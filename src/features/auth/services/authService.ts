import { createClient } from "@/utils/supabase/client";

/**
 * Maps Supabase auth error messages to user-friendly Spanish strings.
 * Anti-enumeration: deliberately generic for credential errors so
 * the error message does not reveal whether an email is registered.
 */
export function mapAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos";
  if (msg.includes("Email not confirmed"))
    return "Correo o contraseña incorrectos";
  if (msg.includes("Password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres";
  return "Ocurrió un error. Intenta de nuevo.";
}

/**
 * Signs in a user with email and password.
 * Throws a translated error string on failure.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(mapAuthError(error.message));
}

/**
 * Initiates Google OAuth sign-in with a redirect back to /auth/callback.
 * Throws a translated error string on failure.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw new Error("Error al iniciar sesión con Google");
}
