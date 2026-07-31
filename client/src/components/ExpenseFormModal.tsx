import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { inputClass, labelClass } from "../lib/styles";
import { CURRENCIES } from "../lib/currencies";
import { useCategories } from "../hooks/useCategories";
import { useCreateExpense, useUpdateExpense } from "../hooks/useExpenses";
import { toInputDate } from "../lib/format";
import { useToast } from "../lib/ToastContext";
import type { Expense } from "../lib/types";

export function ExpenseFormModal({
  expense,
  defaultCategoryId,
  onClose,
}: {
  expense?: Expense;
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const { data: categories } = useCategories("EXPENSE");
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(expense?.currency ?? "USD");
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? defaultCategoryId ?? "");
  const [date, setDate] = useState(expense ? toInputDate(expense.date) : toInputDate(new Date()));
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(expense);
  const isPending = createExpense.isPending || updateExpense.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!description.trim()) return setError("Description is required.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return setError("Enter a valid amount greater than 0.");
    if (!categoryId) return setError("Choose a category.");

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      currency,
      categoryId,
      date: new Date(date).toISOString(),
      notes: notes.trim() || null,
    };

    try {
      if (isEdit && expense) {
        await updateExpense.mutateAsync({ id: expense.id, data: payload });
        toast("Expense updated.");
      } else {
        await createExpense.mutateAsync(payload);
        toast("Expense added.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal title={isEdit ? "Edit expense" : "Add expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Description</label>
          <input
            className={inputClass}
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Grocery run"
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
          <label className={labelClass}>Date</label>
          <input
            className={inputClass}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
            {isPending ? "Saving..." : isEdit ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
