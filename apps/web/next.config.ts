import type { NextConfig } from "next";

// Proxy the API under our own origin so the browser only ever talks to this
// host. That makes `dolang_session` a first-party cookie, which iOS Safari
// (ITP / "Prevent Cross-Site Tracking") keeps — a cross-subdomain cookie
// accepted from a cross-origin response is dropped there.
//
// Deployed environments MUST set `API_PROXY_TARGET` (e.g.
// `https://api.dolang.website/api/v1/:path*`); it must end with `/:path*`.
// Local dev falls back to the NestJS dev server.
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "http://localhost:4000/api/v1/:path*";

if (process.env.NODE_ENV === "production" && !process.env.API_PROXY_TARGET) {
  throw new Error(
    "API_PROXY_TARGET is required in production — set it to the API origin, " +
      "e.g. https://api.dolang.website/api/v1/:path*",
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: API_PROXY_TARGET }];
  },
};

export default nextConfig;
