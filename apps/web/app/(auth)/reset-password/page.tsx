"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "validating" | "invalid" | "valid" | "success";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";

  const [status, setStatus] = useState<Status>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    api
      .get<{ valid: boolean }>(
        `/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
      )
      .then((res) => setStatus(res.valid ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setStatus("success");
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
            Set a new password
          </p>
        </div>

        {status === "validating" && (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "invalid" && (
          <div className="text-center space-y-4">
            <p className="text-[var(--text)] text-sm leading-relaxed">
              This link has expired or is invalid.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-[var(--gold)] hover:text-[var(--gold-light)] text-sm"
            >
              Request a new link
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-4">
            <p className="text-[var(--text)] text-sm leading-relaxed">
              Your password has been updated.
            </p>
            <Link
              href="/login"
              className="inline-block text-[var(--gold)] hover:text-[var(--gold-light)] text-sm"
            >
              Continue to login
            </Link>
          </div>
        )}

        {status === "valid" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
            <Input
              label="Confirm new password"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
          <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
