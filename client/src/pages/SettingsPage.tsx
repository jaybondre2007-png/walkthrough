import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Moon, Sun, ShieldCheck, ShieldOff, RotateCcw, RefreshCw } from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { api, ApiError } from "../lib/api";
import { inputClass, labelClass } from "../lib/styles";
import { CURRENCIES } from "../lib/currencies";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";
import { useToast } from "../lib/ToastContext";
import clsx from "clsx";

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
    </div>
  );
}

function AccountSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const initial = (user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: () => api.auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("New passwords don't match.");
    changePassword.mutate();
  }

  return (
    <Card className="mb-6">
      <SectionHeader title="Account" description="Your profile information and login credentials." />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {initial}
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">{user?.name || "No name set"}</p>
            <p className="text-sm text-neutral-500">{user?.email}</p>
          </div>
        </div>
        {!showPasswordForm && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setShowPasswordForm(true)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Change password
          </Button>
        )}
      </div>

      {showPasswordForm && (
        <form onSubmit={handleSubmit} className="mt-5 max-w-xs space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <div>
            <label className={labelClass}>Current password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowPasswordForm(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function TwoFactorSection() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startSetup = useMutation({
    mutationFn: () => api.auth.setup2fa(),
    onSuccess: (data) => {
      setSetupData(data);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const verifySetup = useMutation({
    mutationFn: () => api.auth.verify2fa(setupData!.secret, code),
    onSuccess: async () => {
      await refreshUser();
      setSetupData(null);
      setCode("");
      toast("Two-factor authentication enabled.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  const disable = useMutation({
    mutationFn: () => api.auth.disable2fa(password),
    onSuccess: async () => {
      await refreshUser();
      setShowDisableForm(false);
      setPassword("");
      toast("Two-factor authentication disabled.");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-start justify-between">
        <SectionHeader
          title="Two-factor authentication"
          description="Add an extra layer of security with a code from an authenticator app."
        />
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            user?.twoFactorEnabled
              ? "bg-good/10 text-good"
              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          )}
        >
          {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {user?.twoFactorEnabled ? (
        showDisableForm ? (
          <div className="max-w-xs space-y-3">
            <label className={labelClass}>Confirm your password to disable</label>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-critical">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDisableForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                style={{ backgroundColor: "#d03b3b" }}
                className="text-white hover:opacity-90"
                disabled={disable.isPending}
                onClick={() => {
                  setError(null);
                  disable.mutate();
                }}
              >
                {disable.isPending ? "Disabling..." : "Disable 2FA"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowDisableForm(true)}>
            <ShieldOff className="h-3.5 w-3.5" />
            Disable two-factor authentication
          </Button>
        )
      ) : setupData ? (
        <div className="max-w-xs space-y-3">
          <p className="text-xs text-neutral-500">
            Scan this QR code with Google Authenticator, Authy, or a similar app, then enter the
            6-digit code it generates.
          </p>
          <img
            src={setupData.qrCode}
            alt="Two-factor authentication QR code"
            className="h-40 w-40 rounded-lg border border-neutral-200 dark:border-neutral-700"
          />
          <p className="break-all text-xs text-neutral-400">
            Can't scan? Enter this key manually: <span className="font-mono">{setupData.secret}</span>
          </p>
          <div>
            <label className={labelClass}>6-digit code</label>
            <input
              className={`${inputClass} text-center tracking-[0.4em]`}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSetupData(null);
                setCode("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={verifySetup.isPending || code.length !== 6}
              onClick={() => {
                setError(null);
                verifySetup.mutate();
              }}
            >
              {verifySetup.isPending ? "Verifying..." : "Verify & enable"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          disabled={startSetup.isPending}
          onClick={() => {
            setError(null);
            startSetup.mutate();
          }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {startSetup.isPending ? "Starting..." : "Enable two-factor authentication"}
        </Button>
      )}
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="mb-6">
      <SectionHeader title="Appearance" description="Choose how ExpenseTrac looks on this device." />
      <div className="flex gap-3">
        {(
          [
            { value: "light" as const, label: "Light", icon: Sun },
            { value: "dark" as const, label: "Dark", icon: Moon },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={clsx(
              "flex flex-1 flex-col items-center gap-2 rounded-lg border px-4 py-4 text-sm font-medium transition-colors",
              theme === opt.value
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            )}
          >
            <opt.icon className="h-5 w-5" />
            {opt.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function NotificationsSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });

  // Optimistic local copy so the switch flips instantly instead of waiting on
  // the round-trip, and the threshold input isn't fighting a controlled value
  // that gets reset by a network response on every keystroke.
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [threshold, setThreshold] = useState("50");

  useEffect(() => {
    if (settings) {
      setAlertsEnabled(settings.budgetAlertsEnabled);
      setThreshold(String(settings.budgetAlertThreshold));
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: Parameters<typeof api.settings.update>[0]) => api.settings.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      // Revert the optimistic toggle if the save failed.
      if (settings) setAlertsEnabled(settings.budgetAlertsEnabled);
      toast("Couldn't save notification settings.", "error");
    },
  });

  function handleToggle() {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    updateSettings.mutate({ budgetAlertsEnabled: next });
  }

  function handleSaveThreshold(e: FormEvent) {
    e.preventDefault();
    const value = Math.min(100, Math.max(1, Number(threshold) || 50));
    setThreshold(String(value));
    updateSettings.mutate(
      { budgetAlertThreshold: value },
      { onSuccess: () => toast("Alert threshold updated.") }
    );
  }

  return (
    <Card className="mb-6">
      <SectionHeader
        title="Notifications"
        description="Get an in-app warning when your spending pace is outrunning your monthly goal."
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Budget alerts</p>
          <p className="text-xs text-neutral-500">
            Warn me when I'm spending faster than my goal allows.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={alertsEnabled}
          onClick={handleToggle}
          className={clsx(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            alertsEnabled ? "bg-brand-500" : "bg-neutral-300 dark:bg-neutral-700"
          )}
        >
          <span
            className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ top: "2px", left: "2px", transform: alertsEnabled ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>

      <form onSubmit={handleSaveThreshold} className="flex items-end gap-2">
        <div>
          <label className={labelClass}>Alert threshold</label>
          <div className="flex items-center gap-2">
            <input
              className={`${inputClass} w-20`}
              type="number"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <span className="text-sm text-neutral-500">% spent, ahead of pace</span>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={updateSettings.isPending}>
          Save
        </Button>
      </form>
    </Card>
  );
}

function DangerZoneSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetData = useMutation({
    mutationFn: () => api.settings.resetData(password),
    onSuccess: () => {
      qc.invalidateQueries();
      setShowConfirm(false);
      setPassword("");
      toast("All your data has been reset. Starting fresh!");
      navigate("/");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    resetData.mutate();
  }

  return (
    <Card className="mb-6 border-critical/30">
      <SectionHeader
        title="Reset all data"
        description="Permanently delete every expense, income entry, and budget, and start fresh. Your account, category names, and login stay intact."
      />

      {showConfirm ? (
        <form onSubmit={handleSubmit} className="max-w-xs space-y-3">
          <p className="text-xs font-medium text-critical">
            This cannot be undone. All expenses, income entries, and category budgets will be
            permanently deleted.
          </p>
          <div>
            <label className={labelClass}>Confirm your password to reset</label>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              style={{ backgroundColor: "#d03b3b" }}
              className="text-white hover:opacity-90"
              disabled={resetData.isPending || !password}
            >
              {resetData.isPending ? "Resetting..." : "Permanently reset data"}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          style={{ backgroundColor: "#d03b3b" }}
          className="text-white hover:opacity-90"
          onClick={() => setShowConfirm(true)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all data
        </Button>
      )}
    </Card>
  );
}

function CurrencySection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const { data: rates } = useQuery({
    queryKey: ["settings", "rates"],
    queryFn: api.settings.rates.list,
  });

  const updateBaseCurrency = useMutation({
    mutationFn: (baseCurrency: string) => api.settings.update({ baseCurrency }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Base currency updated.");
    },
  });

  const upsertRate = useMutation({
    mutationFn: ({ currency, rateToBase }: { currency: string; rateToBase: number }) =>
      api.settings.rates.upsert(currency, rateToBase),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "rates"] });
      toast("Exchange rate saved.");
    },
  });

  const deleteRate = useMutation({
    mutationFn: (currency: string) => api.settings.rates.remove(currency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "rates"] });
      toast("Exchange rate removed.");
    },
  });

  const updateFromLive = useMutation({
    mutationFn: async () => {
      const live = await api.settings.liveRates();
      await Promise.all(
        Object.entries(live.rates).map(([currency, rateToBase]) =>
          api.settings.rates.upsert(currency, rateToBase)
        )
      );
      return live;
    },
    onSuccess: (live) => {
      qc.invalidateQueries({ queryKey: ["settings", "rates"] });
      toast(`Exchange rates updated to live rates as of ${live.date}.`);
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Couldn't fetch live rates.", "error"),
  });

  const [newCurrency, setNewCurrency] = useState("");
  const [newRate, setNewRate] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);

  function handleAddRate(e: FormEvent) {
    e.preventDefault();
    setRateError(null);
    const currency = newCurrency.trim().toUpperCase();
    const rate = Number(newRate);
    if (currency.length !== 3) return setRateError("Currency code must be 3 letters, e.g. EUR.");
    if (!Number.isFinite(rate) || rate <= 0) return setRateError("Enter a valid exchange rate.");

    upsertRate.mutate(
      { currency, rateToBase: rate },
      {
        onSuccess: () => {
          setNewCurrency("");
          setNewRate("");
        },
      }
    );
  }

  return (
    <>
      <Card className="mb-6">
        <SectionHeader
          title="Base currency"
          description="All totals and budgets are shown in this currency. Expenses in other currencies are converted using the rates below."
        />
        <select
          className={`${inputClass} max-w-xs`}
          value={settings?.baseCurrency ?? "USD"}
          onChange={(e) => updateBaseCurrency.mutate(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <SectionHeader
            title="Exchange rates"
            description={`1 unit of currency = this many units of your base currency (${settings?.baseCurrency ?? "USD"}). We provide up-to-date rates by default — you can still override any rate manually below.`}
          />
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={updateFromLive.isPending}
            onClick={() => updateFromLive.mutate()}
          >
            <RefreshCw className={updateFromLive.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {updateFromLive.isPending ? "Updating..." : "Update to live rates"}
          </Button>
        </div>

        <div className="mb-4 space-y-2">
          {rates?.length ? (
            rates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800"
              >
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {rate.currency}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">{rate.rateToBase}</span>
                  <button
                    onClick={() => deleteRate.mutate(rate.currency)}
                    className="rounded-md p-1 text-neutral-400 hover:bg-critical/10 hover:text-critical"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-400">No custom exchange rates yet.</p>
          )}
        </div>

        <form onSubmit={handleAddRate} className="flex items-end gap-2">
          <div>
            <label className={labelClass}>Currency</label>
            <input
              className={`${inputClass} w-24 uppercase`}
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              placeholder="EUR"
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>Rate</label>
            <input
              className={`${inputClass} w-32`}
              type="number"
              step="0.0001"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="1.08"
            />
          </div>
          <Button type="submit" size="sm" disabled={upsertRate.isPending}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </form>
        {rateError && <p className="mt-2 text-sm text-critical">{rateError}</p>}
      </Card>
    </>
  );
}

export function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your account, security, notifications, and currency preferences.
        </p>
      </div>

      <AccountSection />
      <TwoFactorSection />
      <AppearanceSection />
      <NotificationsSection />
      <CurrencySection />
      <DangerZoneSection />
    </div>
  );
}
