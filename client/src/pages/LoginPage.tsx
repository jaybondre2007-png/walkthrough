import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { Button } from "../components/Button";
import { inputClass, labelClass } from "../lib/styles";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { login, completeTwoFactorLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await login(email, password);
      if ("requires2FA" in result) {
        setPendingToken(result.pendingToken);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pendingToken) return;
    setPending(true);
    try {
      await completeTwoFactorLogin(
        pendingToken,
        useRecoveryCode ? { recoveryCode } : { code }
      );
      navigate("/", { replace: true });
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
            {pendingToken ? (
              <ShieldCheck className="h-6 w-6" strokeWidth={2.25} />
            ) : (
              <Wallet className="h-6 w-6" strokeWidth={2.25} />
            )}
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {pendingToken ? "Two-factor verification" : "Welcome back to ExpenseTrac"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {pendingToken
              ? useRecoveryCode
                ? "Enter one of your unused recovery codes."
                : "Enter the 6-digit code from your authenticator app."
              : "Sign in to continue tracking your spending."}
          </p>
        </div>

        {pendingToken ? (
          <form
            onSubmit={handleVerifyCode}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            {useRecoveryCode ? (
              <div className="mb-5">
                <label className={labelClass}>Recovery code</label>
                <input
                  className={`${inputClass} text-center text-lg tracking-widest`}
                  autoComplete="one-time-code"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  placeholder="XXXXX-XXXXX"
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div className="mb-5">
                <label className={labelClass}>Authentication code</label>
                <input
                  className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
            )}

            {error && <p className="mb-4 text-sm text-critical">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={pending || (useRecoveryCode ? !recoveryCode : code.length !== 6)}
            >
              {pending ? "Verifying..." : "Verify & sign in"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode((v) => !v);
                setError(null);
                setCode("");
                setRecoveryCode("");
              }}
              className="mt-3 w-full text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {useRecoveryCode ? "Use my authenticator app instead" : "Use a recovery code instead"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingToken(null);
                setCode("");
                setRecoveryCode("");
                setUseRecoveryCode(false);
                setError(null);
              }}
              className="mt-1 w-full text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-4">
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
              <div className="mb-5">
                <label className={labelClass}>Password</label>
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="mb-4 text-sm text-critical">{error}</p>}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-neutral-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Create one
              </Link>
            </p>

            <p className="mt-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
              Demo login: <span className="font-medium text-neutral-500 dark:text-neutral-300">demo@expensetrac.app</span> /{" "}
              <span className="font-medium text-neutral-500 dark:text-neutral-300">demo1234</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
