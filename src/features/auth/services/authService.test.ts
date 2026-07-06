import { describe, it, expect } from "vitest";
import { mapAuthError } from "./authService";

describe("mapAuthError", () => {
  it("maps Invalid login credentials to generic message (anti-enumeration)", () => {
    expect(mapAuthError("Invalid login credentials")).toBe(
      "Correo o contraseña incorrectos"
    );
  });

  it("maps Email not confirmed to same generic message (anti-enumeration — does not reveal email existence)", () => {
    expect(mapAuthError("Email not confirmed")).toBe(
      "Correo o contraseña incorrectos"
    );
  });

  it("maps password length error", () => {
    expect(mapAuthError("Password should be at least 6 characters")).toBe(
      "La contraseña debe tener al menos 6 caracteres"
    );
  });

  it("returns fallback for unknown error messages", () => {
    expect(mapAuthError("some unknown supabase error")).toBe(
      "Ocurrió un error. Intenta de nuevo."
    );
  });

  it("returns fallback for empty string", () => {
    expect(mapAuthError("")).toBe("Ocurrió un error. Intenta de nuevo.");
  });
});
