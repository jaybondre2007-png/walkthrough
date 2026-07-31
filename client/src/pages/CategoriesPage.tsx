import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { CategoryFormModal } from "../components/CategoryFormModal";
import { useCategories, useDeleteCategory } from "../hooks/useCategories";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { getIcon } from "../lib/icons";
import { useToast } from "../lib/ToastContext";
import type { Category, CategoryKind } from "../lib/types";

export function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const { data: categories, isLoading } = useCategories(kind);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const { data: expenseBreakdown } = useQuery({
    queryKey: ["dashboard", "by-category"],
    queryFn: () => api.dashboard.byCategory(),
    enabled: kind === "EXPENSE",
  });
  const { data: incomeBreakdown } = useQuery({
    queryKey: ["analytics", "income-by-category"],
    queryFn: () => api.analytics.incomeByCategory(),
    enabled: kind === "INCOME",
  });
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const [modalState, setModalState] = useState<{ open: boolean; category?: Category }>({
    open: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const spentByCategory = new Map((expenseBreakdown ?? []).map((b) => [b.categoryId, b.spent]));
  const earnedByCategory = new Map((incomeBreakdown ?? []).map((b) => [b.categoryId, b.earned]));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Categories</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Organize spending and income, and set monthly budgets.
          </p>
        </div>
        <Button onClick={() => setModalState({ open: true })}>
          <Plus className="h-4 w-4" />
          New {kind === "INCOME" ? "income " : ""}category
        </Button>
      </div>

      <div className="mb-6 inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {(["EXPENSE", "INCOME"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={clsx(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              kind === k
                ? "bg-brand-500 text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            {k === "EXPENSE" ? "Expense categories" : "Income categories"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-neutral-400">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => {
            const Icon = getIcon(category.icon);
            const isIncome = kind === "INCOME";
            const amount = isIncome
              ? earnedByCategory.get(category.id) ?? 0
              : spentByCategory.get(category.id) ?? 0;
            const pct = category.budget ? Math.min(100, (amount / category.budget) * 100) : null;
            const over = category.budget != null && amount > category.budget;
            const count = isIncome ? category._count?.incomes : category._count?.expenses;

            return (
              <Card key={category.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${category.color}18`, color: category.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {category.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {count ?? 0} {isIncome ? "entr" : "expense"}
                        {isIncome ? (count === 1 ? "y" : "ies") : count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModalState({ open: true, category })}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(category)}
                      className="rounded-md p-1.5 text-neutral-400 hover:bg-critical/10 hover:text-critical"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {!isIncome && category.budget != null ? (
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                      <span className="text-neutral-500">
                        {formatMoney(amount, baseCurrency)} of {formatMoney(category.budget, baseCurrency)}
                      </span>
                      <span className={over ? "font-medium text-critical" : "text-neutral-400"}>
                        {pct?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: over ? "#d03b3b" : category.color,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">
                    {formatMoney(amount, baseCurrency)} {isIncome ? "earned" : "spent"} this month
                    {!isIncome ? " · no budget set" : ""}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modalState.open && (
        <CategoryFormModal
          category={modalState.category}
          kind={kind}
          onClose={() => setModalState({ open: false })}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Delete category?
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              "{deleteTarget.name}" and all its {kind === "INCOME" ? "income entries" : "expenses"} will
              be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#d03b3b" }}
                className="text-white hover:opacity-90"
                disabled={deleteCategory.isPending}
                onClick={async () => {
                  await deleteCategory.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                  toast("Category deleted.");
                }}
              >
                {deleteCategory.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
