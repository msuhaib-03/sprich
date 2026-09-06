"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader, MobileBottomNav } from "@/components/layout/mobile-nav";

type Status = "checking" | "authed" | "error";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const immersive = useUiStore((s) => s.immersive);

  // The session lives in an HttpOnly cookie we can't read, so ask the API who
  // we are. Every branch reaches a terminal state — never an endless spinner.
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    api
      .get<User>("/users/me")
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authed");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        // 401/403 come back as thrown "Unauthorized"/"Forbidden" from api.ts.
        if (/unauthor|forbidden|401|403/i.test(message)) {
          router.replace("/login");
        } else {
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router, setUser]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-screen bg-[var(--bg)] px-6 text-center">
        <p className="text-[var(--faint)] text-sm">
          Couldn&apos;t reach the server. Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-[var(--gold)] hover:text-[var(--gold-light)] text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "checking" && !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <span className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Fixed-height shell: on mobile the header sits above and the tab bar below
  // a scrollable <main>, so nothing ever overlaps content. Desktop keeps the
  // sidebar. [height:100dvh] tracks mobile browser chrome; h-screen is the
  // fallback where dvh is unsupported.
  //
  // Immersive mode (the /speak conversation) drops the mobile header + tab bar
  // and hands the full column to the view, which runs its own 100dvh layout so
  // the soft keyboard never squishes the chat. <main> stays mounted either way
  // — only its scroll behaviour changes — so toggling immersive never remounts
  // the page (which would wipe in-progress view state).
  return (
    // Inline height wins the cascade over any `h-screen`-style utility, so the
    // shell is the *dynamic* viewport (shrinks for the mobile URL bar). That
    // matters most in immersive mode, where nothing scrolls to retract the bar
    // — a `100vh` shell would hide the chat header behind it. `h-screen` stays
    // as the fallback for browsers without `dvh`.
    <div className="flex h-screen bg-[var(--bg)]" style={{ height: "100dvh" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!immersive && <MobileHeader />}
        <main
          className={
            immersive
              ? "flex-1 min-h-0 flex flex-col overflow-hidden"
              : "flex-1 overflow-y-auto"
          }
        >
          {children}
        </main>
        {!immersive && <MobileBottomNav />}
      </div>
    </div>
  );
}
