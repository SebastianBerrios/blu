import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

let supabaseOrigin: string | undefined;
let supabaseWsOrigin: string | undefined;

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    supabaseOrigin = url.origin;
    supabaseWsOrigin = `wss://${url.host}`;
  } catch {
    // Invalid URL — omit Supabase origins from the CSP rather than crash the build
  }
}

// Derive Sentry ingest host from DSN (same parse-from-env pattern as Supabase)
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sentryIngestOrigin: string | undefined;

if (sentryDsn) {
  try {
    const url = new URL(sentryDsn);
    sentryIngestOrigin = url.origin;
  } catch {
    // Invalid DSN — omit from CSP rather than crash the build
  }
}

const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self'",
  ["connect-src 'self'", supabaseOrigin, supabaseWsOrigin, sentryIngestOrigin]
    .filter(Boolean)
    .join(" "),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Only upload source maps when auth token is present (CI/CD)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
