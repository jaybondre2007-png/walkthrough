import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Wallet, CheckCircle2 } from "lucide-react";
import { Button } from "../components/Button";
import { inputClass, labelClass } from "../lib/styles";
import { api, ApiError } from "../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            {sent ? <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} /> : <KeyRound className="h-6 w-6" strokeWidth={2.25} />}
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {sent ? "Check your email" : "Reset your password"}
          </h1>
          <p className="mt-1 text-center text-sm text-neutral-500">
            {sent
              ? "If an account exists for that email, we've sent a link to reset your password."
              : "Enter your email and we'll send you a link to set a new password."}
          </p>
        </div>

        {!sent && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-5">
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </div>

            {error && <p className="mb-4 text-sm text-critical">{error}</p>}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-5 flex items-center justify-center gap-1 text-center text-sm text-neutral-500">
          <Wallet className="h-3.5 w-3.5" />
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
