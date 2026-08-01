import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import clsx from "clsx";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { CategoryFormModal } from "./CategoryFormModal";
import { inputClass, labelClass } from "../lib/styles";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import type { BudgetLabel } from "../lib/types";

export function GoalFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const [amount, setAmount] = useState(settings?.monthlyBudget?.toString() ?? "");
  const [label, setLabel] = useState<BudgetLabel>(settings?.budgetLabel ?? "BUDGET");
  const [error, setError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const saveGoal = useMutation({
    mutationFn: (monthlyBudget: number | null) =>
      api.settings.update({ monthlyBudget, budgetLabel: label }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast(`Monthly ${label === "GOAL" ? "goal" : "budget"} updated.`);
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Something went wrong."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = amount.trim();
    if (!trimmed) return saveGoal.mutate(null);
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a valid amount greater than 0.");
    saveGoal.mutate(value);
  }

  if (showNewCategory) {
    return <CategoryFormModal kind="EXPENSE" onClose={() => setShowNewCategory(false)} />;
  }

  return (
    <Modal title="Set your monthly budget or goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-500">
          Track an overall spending target for the month. We'll warn you if you're on pace to go
          over.
        </p>

        <div>
          <label className={labelClass}>Track this as a</label>
          <div className="flex gap-2">
            {(
              [
                { value: "BUDGET" as const, label: "Budget" },
                { value: "GOAL" as const, label: "Goal" },
              ]
            ).map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setLabel(opt.value)}
                className={clsx(
                  "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  label === opt.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {label === "GOAL" ? "Goal" : "Budget"} amount ({settings?.baseCurrency ?? "USD"})
          </label>
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 2000"
            autoFocus
          />
          <p className="mt-1.5 text-xs text-neutral-400">
            Leave blank to remove your {label === "GOAL" ? "goal" : "budget"}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Track this with a new category budget instead
        </button>

        {error && <p className="text-sm text-critical">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveGoal.isPending}>
            <Target className="h-4 w-4" />
            {saveGoal.isPending ? "Saving..." : `Save ${label === "GOAL" ? "goal" : "budget"}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
