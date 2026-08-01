import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { inputClass, labelClass } from "../lib/styles";
import { CURRENCIES } from "../lib/currencies";
import { useCategories } from "../hooks/useCategories";
import { useCreateRecurring, useUpdateRecurring } from "../hooks/useRecurring";
import { toInputDate } from "../lib/format";
import { useToast } from "../lib/ToastContext";
import type { CategoryKind, RecurringFrequency, RecurringTransaction } from "../lib/types";

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export function RecurringFormModal({
  rule,
  defaultKind = "EXPENSE",
  onClose,
}: {
  rule?: RecurringTransaction;
  defaultKind?: CategoryKind;
  onClose: () => void;
}) {
  const isEdit = Boolean(rule);
  const [kind, setKind] = useState<CategoryKind>(rule?.kind ?? defaultKind);
  const { data: categories } = useCategories(kind);
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const { toast } = useToast();

  const [description, setDescription] = useState(rule?.description ?? "");
  const [amount, setAmount] = useState(rule?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(rule?.currency ?? "USD");
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(rule?.frequency ?? "MONTHLY");
  const [startDate, setStartDate] = useState(
    rule ? toInputDate(rule.startDate) : toInputDate(new Date())
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(rule?.endDate));
  const [endDate, setEndDate] = useState(rule?.endDate ? toInputDate(rule.endDate) : "");
  const [notes, setNotes] = useState(rule?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isPending = createRecurring.isPending || updateRecurring.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!description.trim()) return setError("Description is required.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return setError("Enter a valid amount greater than 0.");
    if (!categoryId) return setError("Choose a category.");

    try {
      if (isEdit && rule) {
        await updateRecurring.mutateAsync({
          id: rule.id,
          data: {
            description: description.trim(),
            amount: parsedAmount,
            currency,
            categoryId,
            frequency,
            endDate: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
            notes: notes.trim() || null,
          },
        });
        toast("Recurring entry updated.");
      } else {
        const result = await createRecurring.mutateAsync({
          kind,
          description: description.trim(),
          amount: parsedAmount,
          currency,
          categoryId,
          frequency,
          startDate: new Date(startDate).toISOString(),
          endDate: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
          notes: notes.trim() || null,
        });
        toast(
          result.generated > 0
            ? `Recurring entry created — ${result.generated} occurrence${result.generated === 1 ? "" : "s"} added.`
            : "Recurring entry created."
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal title={isEdit ? "Edit recurring entry" : "New recurring entry"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-2">
              {(
                [
                  { value: "EXPENSE" as const, label: "Expense" },
                  { value: "INCOME" as const, label: "Income" },
                ]
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    setKind(opt.value);
                    setCategoryId("");
                  }}
                  className={clsx(
                    "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    kind === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Description</label>
          <input
            className={inputClass}
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "INCOME" ? "e.g. Monthly salary" : "e.g. Rent"}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Amount</label>
            <input
              className={inputClass}
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select
              className={inputClass}
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Repeats</label>
          <div className="flex gap-2">
            {FREQUENCIES.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={clsx(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  frequency === f.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className={labelClass}>Starts on</label>
            <input
              className={inputClass}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              We'll create the first entry right away, and catch up on any past occurrences.
            </p>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300"
            />
            Ends on a specific date
          </label>
          {hasEndDate && (
            <input
              className={`${inputClass} mt-2`}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details..."
          />
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save changes" : "Create recurring entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
