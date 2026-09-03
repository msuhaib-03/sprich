import type { NextConfig } from "next";

// The /api/v1/* proxy lives in middleware.ts (resolved at request time, not
// build time — a missing env var can't break the build there).
const nextConfig: NextConfig = {};

export default nextConfig;
