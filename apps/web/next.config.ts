import type { NextConfig } from "next";

// Proxy the API under our own origin so the browser only ever talks to
// dolang.website. That makes `dolang_session` a first-party cookie, which iOS
// Safari (ITP / "Prevent Cross-Site Tracking") persists reliably — a
// cross-subdomain cookie set via fetch() does not survive there.
//
// API_PROXY_TARGET points at the real API and MUST end with `/:path*`.
// Prod: https://api.dolang.website/api/v1/:path*  ·  local: the default below.
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "http://localhost:4000/api/v1/:path*";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: API_PROXY_TARGET }];
  },
};

export default nextConfig;
