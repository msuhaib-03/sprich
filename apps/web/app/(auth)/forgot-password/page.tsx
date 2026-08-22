"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black gold-text">
            Sprich
          </Link>
          <p className="text-[var(--faint)] text-sm mt-1">
            Reset your password
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-[var(--text)] text-sm leading-relaxed">
              If that email is registered, we&apos;ve sent a link to reset
              your password. Check your inbox.
            </p>
            <Link
              href="/login"
              className="inline-block text-[var(--gold)] hover:text-[var(--gold-light)] text-sm"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                Send reset link
              </Button>
            </form>

            <p className="text-center text-[var(--faint)] text-sm mt-6">
              Remembered it?{" "}
              <Link
                href="/login"
                className="text-[var(--gold)] hover:text-[var(--gold-light)]"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
