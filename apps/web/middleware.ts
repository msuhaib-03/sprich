import { NextRequest, NextResponse } from "next/server";

// Proxy /api/v1/* to the real API so the browser only ever talks to this
// origin — that keeps `dolang_session` a first-party cookie, which iOS Safari
// keeps (a cross-subdomain cookie is dropped there).
//
// The target is resolved at REQUEST time, not build time: a missing or
// misnamed env var can't fail the Vercel build (you get a clear runtime 502
// instead and the rest of the site stays up). It's read server-side here and
// never reaches the browser.
//
//   API_PROXY_ORIGIN   the API origin, e.g. https://api.dolang.website
//                      (required in every deployed environment)
//   API_PROXY_TARGET   legacy — the same, optionally with an `/api/v1/...`
//                      suffix, which is stripped
//   local dev          falls back to the NestJS dev server

export const config = { matcher: "/api/v1/:path*" };

function resolveOrigin(): string | null {
  if (process.env.API_PROXY_ORIGIN) {
    return process.env.API_PROXY_ORIGIN.replace(/\/+$/, "");
  }
  if (process.env.API_PROXY_TARGET) {
    // e.g. "https://api.dolang.website/api/v1/:path*" -> "https://api.dolang.website"
    try {
      return new URL(process.env.API_PROXY_TARGET).origin;
    } catch {
      return null;
    }
  }
  return process.env.NODE_ENV !== "production" ? "http://localhost:4000" : null;
}

export function middleware(req: NextRequest) {
  const origin = resolveOrigin();
  if (!origin) {
    return NextResponse.json(
      { message: "API proxy is not configured — set API_PROXY_ORIGIN" },
      { status: 502 },
    );
  }
  return NextResponse.rewrite(
    new URL(req.nextUrl.pathname + req.nextUrl.search, origin),
  );
}
