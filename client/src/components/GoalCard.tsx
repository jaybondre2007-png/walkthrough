import { Target, Pencil } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { formatMoney } from "../lib/format";

export function GoalCard({
  monthlyBudget,
  spent,
  baseCurrency,
  onEdit,
}: {
  monthlyBudget: number | null;
  spent: number;
  baseCurrency: string;
  onEdit: () => void;
}) {
  const pct = monthlyBudget ? Math.min(100, (spent / monthlyBudget) * 100) : null;
  const over = monthlyBudget != null && spent > monthlyBudget;

  return (
    <Card className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Monthly goal</h2>
        </div>
        {monthlyBudget != null && (
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Edit goal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {monthlyBudget != null ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-300">
              {formatMoney(spent, baseCurrency)} of {formatMoney(monthlyBudget, baseCurrency)}
            </span>
            <span className={over ? "font-medium text-critical" : "text-neutral-400"}>
              {pct?.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: over ? "#d03b3b" : "#2a78d6" }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Set a monthly spending goal to track your progress and get pace alerts.
          </p>
          <Button size="sm" onClick={onEdit} className="ml-4 shrink-0">
            Set goal
          </Button>
        </div>
      )}
    </Card>
  );
}
