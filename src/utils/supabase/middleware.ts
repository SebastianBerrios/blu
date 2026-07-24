import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Redirect that carries over the cookies Supabase refreshed on `base` during
// getUser(). A bare NextResponse.redirect drops the rotated session cookies,
// which can cause auth churn on the next request (Supabase SSR footgun).
const redirectPreservingSession = (url: URL, base: NextResponse): NextResponse => {
  const res = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
};

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login";

  // Si está autenticado y en /login, redirigir al inicio
  if (user && isLoginPage) {
    return redirectPreservingSession(new URL("/", request.url), supabaseResponse);
  }

  // Si no está autenticado y no está en /login, redirigir a login
  if (!user && !isLoginPage) {
    return redirectPreservingSession(new URL("/login", request.url), supabaseResponse);
  }

  // Server-side guard for the 4 permanently admin-only paths (ADR-5).
  // Cheap prefix check runs synchronously before any DB query.
  const SENSITIVE_PREFIXES = ["/finanzas", "/estadisticas", "/auditoria", "/users"];
  if (user && SENSITIVE_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    // Null/missing profile → treat as non-admin (fail-closed).
    if (profile?.role !== "admin") {
      return redirectPreservingSession(new URL("/", request.url), supabaseResponse);
    }
  }

  return supabaseResponse;
};
