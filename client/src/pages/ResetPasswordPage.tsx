import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "../components/Button";
import { inputClass, labelClass } from "../lib/styles";
import { api, ApiError } from "../lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) return;
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords don't match.");

    setPending(true);
    try {
      await api.auth.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const invalidLink = !token;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            {done ? <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} /> : <ShieldCheck className="h-6 w-6" strokeWidth={2.25} />}
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {done ? "Password updated" : "Set a new password"}
          </h1>
          <p className="mt-1 text-center text-sm text-neutral-500">
            {invalidLink
              ? "This reset link is missing its token. Request a new one from the sign-in page."
              : done
                ? "You can now sign in with your new password."
                : "Choose a new password for your account."}
          </p>
        </div>

        {!invalidLink && !done && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-4">
              <label className={labelClass}>New password</label>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
            </div>
            <div className="mb-5">
              <label className={labelClass}>Confirm new password</label>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="mb-4 text-sm text-critical">{error}</p>}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-neutral-500">
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
