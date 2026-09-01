"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "@/components/ui/google-button";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: User }>(
        "/auth/register",
        form,
      );
      setAuth(res.accessToken, res.user);
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          <p className="text-[var(--faint)] text-sm mt-1">
            Start Your Language Journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            placeholder="Ahmad Khan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
            data-testid="signup-name"
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            data-testid="signup-email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            data-testid="signup-password"
          />

          {error && (
            <p
              className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3"
              data-testid="signup-error"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" data-testid="signup-submit">
            Create account
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
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--gold)] hover:text-[var(--gold-light)]"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
