"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";

function OAuthCallback() {
  const router = useRouter();
  const code = useSearchParams().get("code");
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Missing code — please try signing in again.");
      return;
    }
    // The URL only ever carries a one-time code, never the real token (a
    // real token in the URL would end up in browser history). Trade the
    // code for the real token first, then continue like a normal login.
    api
      .post<{ accessToken: string }>("/auth/oauth/exchange", { code })
      .then(({ accessToken }) => {
        // lib/api.ts reads the token from here on every request, so it has
        // to land in localStorage before the /users/me call below.
        localStorage.setItem("sprich_token", accessToken);
        return api.get<User>("/users/me").then((user) => {
          setAuth(accessToken, user);
          const needsOnboarding = !user.profile || !user.goal;
          router.push(needsOnboarding ? "/onboarding" : "/dashboard");
        });
      })
      .catch(() => {
        localStorage.removeItem("sprich_token");
        setError("Could not complete sign-in — please try again.");
      });
  }, [code, setAuth, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      {error ? (
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <a href="/login" className="text-[var(--gold)] hover:text-[var(--gold-light)] text-sm">
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
