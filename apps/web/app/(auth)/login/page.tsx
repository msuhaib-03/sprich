"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "@/components/ui/google-button";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await api.post<{ user: User }>("/auth/login", form);
      setUser(user);
      // If onboarding not done, send there; otherwise dashboard
      const needsOnboarding = !user.profile || !user.goal;
      router.push(needsOnboarding ? "/onboarding" : "/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img
              src="/doLang.svg"
              alt="doLang"
              width={107}
              height={31}
              className="h-7 w-auto"
            />
          </Link>
          <p className="text-[var(--faint)] text-sm mt-1">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoFocus
            data-testid="login-email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            data-testid="login-password"
          />
          <div className="text-right -mt-2">
            <Link
              href="/forgot-password"
              className="text-[var(--faint)] text-sm hover:text-[var(--gold)]"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p
              className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3"
              data-testid="login-error"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" data-testid="login-submit">
            Log in
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[var(--faint)] text-xs uppercase tracking-wider">
            or continue with
          </span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <GoogleButton />

        <p className="text-center text-[var(--faint)] text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[var(--gold)] hover:text-[var(--gold-light)]"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
