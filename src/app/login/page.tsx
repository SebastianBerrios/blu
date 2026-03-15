"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Coffee, Mail, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError("Error al iniciar sesión con Google");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) {
        setError(getErrorMessage(error.message));
      } else {
        setMessage("Revisa tu correo para confirmar tu cuenta.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(getErrorMessage(error.message));
      } else {
        window.location.href = "/";
      }
    }

    setLoading(false);
  };

  const getErrorMessage = (msg: string) => {
    if (msg.includes("Invalid login credentials"))
      return "Correo o contraseña incorrectos";
    if (msg.includes("Email not confirmed"))
      return "Debes confirmar tu correo electrónico";
    if (msg.includes("already registered"))
      return "Este correo ya está registrado";
    if (msg.includes("Password should be at least"))
      return "La contraseña debe tener al menos 6 caracteres";
    return "Ocurrió un error. Intenta de nuevo.";
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-primary-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary-500 rounded-2xl mb-4">
            <Coffee size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Blu Café</h1>
          <p className="text-slate-500 mt-1">Gestión de Negocio</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900 text-center mb-6">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-900 font-medium min-h-[44px]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-400">o</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Tu nombre"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {loading
                ? "Cargando..."
                : isRegister
                  ? "Registrarse"
                  : "Iniciar sesión"}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-slate-600 mt-6">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setMessage("");
              }}
              className="text-primary-600 font-medium hover:underline"
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
