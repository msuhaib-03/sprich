import type { NextConfig } from "next";

// Proxy /api/v1/* to the real API so the browser only ever talks to this
// origin — that keeps `dolang_session` a first-party cookie, which iOS Safari
// keeps (a cross-subdomain cookie is dropped there).
//
// `API_PROXY_TARGET` is the real API. It may be a bare origin
// ("https://api.dolang.website") or the full rewrite template
// ("https://api.dolang.website/api/v1/:path*") — both are normalised below.
// Required in every deployed environment (and listed in turbo.json so Turbo
// passes it through to the build). Local dev falls back to the NestJS dev server.
const rawTarget =
  process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const API_PROXY_DESTINATION = rawTarget.includes(":path*")
  ? rawTarget
  : `${rawTarget.replace(/\/+$/, "")}/api/v1/:path*`;

// Sent on every response. No CSP yet (needs an allow-list pass against the
// inline theme/polyfill script + Vercel analytics); the rest are safe defaults.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: API_PROXY_DESTINATION }];
  },
};

export default nextConfig;
