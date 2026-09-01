"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy landing spot. Google OAuth now finishes entirely on the API: it sets
 * the session cookie and redirects straight to /dashboard or /onboarding, so
 * this page is only ever reached via a stale bookmark or an old redirect URI.
 * Bounce to the dashboard — the (app) layout re-checks the session there.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
