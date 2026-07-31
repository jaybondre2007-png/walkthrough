import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { CategoryFormModal } from "./CategoryFormModal";
import { inputClass, labelClass } from "../lib/styles";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/ToastContext";

export function GoalFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const [amount, setAmount] = useState(settings?.monthlyBudget?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const saveGoal = useMutation({
    mutationFn: (monthlyBudget: number | null) => api.settings.update({ monthlyBudget }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Monthly goal updated.");
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
    <Modal title="Set your monthly goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-500">
          Set an overall spending goal for the month. We'll warn you if you're on pace to go over.
        </p>
        <div>
          <label className={labelClass}>Goal amount ({settings?.baseCurrency ?? "USD"})</label>
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
          <p className="mt-1.5 text-xs text-neutral-400">Leave blank to remove your goal.</p>
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
            {saveGoal.isPending ? "Saving..." : "Save goal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
