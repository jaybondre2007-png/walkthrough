import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { inputClass, labelClass } from "../lib/styles";
import { EXPENSE_ICON_NAMES, INCOME_ICON_NAMES, getIcon } from "../lib/icons";
import { useCreateCategory, useUpdateCategory } from "../hooks/useCategories";
import { useToast } from "../lib/ToastContext";
import type { Category, CategoryKind } from "../lib/types";
import clsx from "clsx";

const PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#898781",
];

export function CategoryFormModal({
  category,
  kind,
  onClose,
}: {
  category?: Category;
  kind: CategoryKind;
  onClose: () => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { toast } = useToast();

  const iconNames = kind === "INCOME" ? INCOME_ICON_NAMES : EXPENSE_ICON_NAMES;

  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [icon, setIcon] = useState(category?.icon ?? iconNames[0]);
  const [budget, setBudget] = useState(category?.budget?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(category);
  const isPending = createCategory.isPending || updateCategory.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    const parsedBudget = budget.trim() ? Number(budget) : null;
    if (budget.trim() && (!Number.isFinite(parsedBudget) || (parsedBudget ?? 0) < 0)) {
      return setError("Budget must be a positive number.");
    }

    const payload = {
      name: name.trim(),
      kind,
      color,
      icon,
      budget: kind === "EXPENSE" ? parsedBudget : null,
    };

    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, data: payload });
        toast("Category updated.");
      } else {
        await createCategory.mutateAsync(payload);
        toast("Category created.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit category" : kind === "INCOME" ? "New income category" : "New category"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "INCOME" ? "e.g. Bonus" : "e.g. Groceries"}
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>Color</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((hex) => (
              <button
                type="button"
                key={hex}
                onClick={() => setColor(hex)}
                className={clsx(
                  "h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110",
                  color === hex && "ring-2 ring-neutral-900 dark:ring-white"
                )}
                style={{ backgroundColor: hex }}
                aria-label={hex}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Icon</label>
          <div className="grid grid-cols-8 gap-2">
            {iconNames.map((name) => {
              const Icon = getIcon(name);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => setIcon(name)}
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                    icon === name
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {kind === "EXPENSE" && (
          <div>
            <label className={labelClass}>Monthly budget (optional)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 300"
            />
          </div>
        )}

        {error && <p className="text-sm text-critical">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
