import type { NextConfig } from "next";

// Proxy the API under our own origin so the browser only ever talks to this
// host. That makes `dolang_session` a first-party cookie, which iOS Safari
// (ITP / "Prevent Cross-Site Tracking") keeps — a cross-subdomain cookie set
// via fetch() / accepted from a cross-origin response is dropped there.
//
// Where the proxy forwards to. Defaults are baked in so no env var is required:
//   prod  (NODE_ENV=production, e.g. Vercel) -> the Render API
//   local -> the NestJS dev server
// `API_PROXY_TARGET` overrides both; it MUST end with `/:path*`.
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ??
  (process.env.NODE_ENV === "production"
    ? "https://api.dolang.website/api/v1/:path*"
    : "http://localhost:4000/api/v1/:path*");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: API_PROXY_TARGET }];
  },
};

export default nextConfig;
