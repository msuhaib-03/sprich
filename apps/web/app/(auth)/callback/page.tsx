"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";

// TEMPORARY DIAGNOSTIC — mirrors safe stage markers to the browser console and
// to /api/debug/oauth so the whole Google sign-in sequence shows up in Vercel
// logs (the console isn't reachable on iPhone). Never passes the code or token.
// Remove once the callback issue is root-caused.
function diag(stage: string, extra: Record<string, unknown> = {}) {
  const payload = { event: "oauth_callback", stage, ...extra };
  try {
    console.log("[OAUTH_CALLBACK]", payload);
  } catch {
    /* noop */
  }
  try {
    navigator.sendBeacon?.(
      "/api/debug/oauth",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    /* best effort */
  }
}

// Deterministic upper bound on the code-exchange request. If the API instance
// is cold and never responds, we abort and show an error instead of spinning
// forever (see STEP 6 — every auth path must reach a terminal state). This is a
// failure bound, not a retry delay.
const EXCHANGE_TIMEOUT_MS = 20_000;

function OAuthCallback() {
  const router = useRouter();
  const code = useSearchParams().get("code");
  const setAuth = useAuthStore((s) => s.setAuth);
  const [exchangeError, setExchangeError] = useState("");
  // Exchange the code exactly once — guards against re-renders and React's
  // dev-only double-invoked effects consuming the one-time code twice.
  const startedRef = useRef(false);

  // A missing code is knowable at render time — deriving it (rather than setting
  // state in the effect) keeps the "always reaches a terminal state" guarantee
  // without a cascading render.
  const error = !code
    ? "Missing code — please try signing in again."
    : exchangeError;

  useEffect(() => {
    diag("start", {
      hasCode: Boolean(code),
      ua:
        typeof navigator !== "undefined"
          ? navigator.userAgent.slice(0, 90)
          : null,
    });

    if (!code) {
      diag("no_code");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EXCHANGE_TIMEOUT_MS);

    diag("exchange_request");
    api
      .post<{ accessToken: string; user: User }>(
        "/auth/oauth/exchange",
        { code },
        { signal: controller.signal },
      )
      .then(({ accessToken, user }) => {
        clearTimeout(timer);
        diag("exchange_success", {
          hasToken: Boolean(accessToken),
          hasUser: Boolean(user),
          userId: user?.id ?? null,
        });

        setAuth(accessToken, user);
        diag("auth_stored", {
          tokenPersisted:
            typeof localStorage !== "undefined" &&
            Boolean(localStorage.getItem("dolang_token")),
        });

        const target =
          !user.profile || !user.goal ? "/onboarding" : "/dashboard";
        diag("redirect", { target });
        router.replace(target);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        const name = err instanceof Error ? err.name : "Unknown";
        const message =
          err instanceof Error ? err.message.slice(0, 140) : String(err);
        diag("exchange_error", { name, message, aborted: name === "AbortError" });
        try {
          localStorage.removeItem("dolang_token");
        } catch {
          /* noop */
        }
        setExchangeError(
          name === "AbortError"
            ? "Sign-in timed out — please try again."
            : "Could not complete sign-in — please try again.",
        );
      });
  }, [code, setAuth, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      {error ? (
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <a
            href="/login"
            className="text-[var(--gold)] hover:text-[var(--gold-light)] text-sm"
          >
            Back to login
          </a>
        </div>
      ) : (
        <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
          <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}
