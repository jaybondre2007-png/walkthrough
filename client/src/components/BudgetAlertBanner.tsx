import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, OctagonAlert } from "lucide-react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";

export function BudgetAlertBanner({
  baseCurrency,
  onAdjust,
}: {
  baseCurrency: string;
  onAdjust: () => void;
}) {
  const { data: alert } = useQuery({
    queryKey: ["dashboard", "budget-alert"],
    queryFn: api.dashboard.budgetAlert,
  });

  if (!alert?.active) return null;

  const isCritical = alert.severity === "critical";
  const Icon = isCritical ? OctagonAlert : AlertTriangle;

  return (
    <div
      className={
        "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 " +
        (isCritical
          ? "border-critical/25 bg-critical/5 text-critical"
          : "border-warning/30 bg-warning/10 text-[#8a5a00] dark:text-warning")
      }
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {isCritical
            ? `You've exceeded your monthly goal of ${formatMoney(alert.monthlyBudget ?? 0, baseCurrency)}.`
            : `You're on pace to exceed your monthly goal.`}
        </p>
        <p className="mt-0.5 text-xs opacity-90">
          Spent {formatMoney(alert.spent ?? 0, baseCurrency)} ({(alert.pctSpent ?? 0).toFixed(0)}%) with{" "}
          {(100 - (alert.pctTimeElapsed ?? 0)).toFixed(0)}% of the month remaining
          {alert.projectedSpend != null &&
            ` · projected to reach ${formatMoney(alert.projectedSpend, baseCurrency)}`}
          .
        </p>
      </div>
      <button
        onClick={onAdjust}
        className="shrink-0 whitespace-nowrap text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
      >
        Adjust goal
      </button>
    </div>
  );
}
