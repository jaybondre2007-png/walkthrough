import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Download, FileSpreadsheet, FileText, Repeat, Wallet } from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { DropdownMenu, DropdownItem } from "../components/DropdownMenu";
import { IncomeFormModal } from "../components/IncomeFormModal";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { useCategories } from "../hooks/useCategories";
import { useDeleteIncome, useIncome } from "../hooks/useIncome";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import { getIcon } from "../lib/icons";
import { inputClass } from "../lib/styles";
import { exportTransactionsToCsv, exportTransactionsToPdf } from "../lib/export";
import { useToast } from "../lib/ToastContext";
import type { Income } from "../lib/types";

export function IncomePage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [modalState, setModalState] = useState<{ open: boolean; income?: Income }>({
    open: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);
  const { toast } = useToast();

  const { data: categories } = useCategories("INCOME");
  const { data: incomes, isLoading } = useIncome({
    categoryId: categoryId || undefined,
    search: search || undefined,
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const deleteIncome = useDeleteIncome();
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const total = useMemo(() => incomes?.reduce((sum, e) => sum + e.amountBase, 0) ?? 0, [incomes]);

  function handleExportCsv() {
    if (!incomes?.length) return toast("No income entries to export.", "info");
    exportTransactionsToCsv(incomes, `income-${new Date().toISOString().slice(0, 10)}.csv`);
    toast("Exported income as CSV (Excel-compatible).");
  }

  function handleExportPdf() {
    if (!incomes?.length) return toast("No income entries to export.", "info");
    exportTransactionsToPdf(
      incomes,
      baseCurrency,
      "Income Report",
      `income-${new Date().toISOString().slice(0, 10)}.pdf`
    );
    toast("Exported income as PDF.");
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Income</h1>
          <p className="mt-1 text-sm text-neutral-500">Track salary, business, and other earnings.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={
              <Button variant="secondary">
                <Download className="h-4 w-4" />
                Export
              </Button>
            }
          >
            <DropdownItem onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4 text-good" />
              Export as Excel (CSV)
            </DropdownItem>
            <DropdownItem onClick={handleExportPdf}>
              <FileText className="h-4 w-4 text-critical" />
              Export as PDF
            </DropdownItem>
          </DropdownMenu>
          <Button onClick={() => setModalState({ open: true })}>
            <Plus className="h-4 w-4" />
            Add income
          </Button>
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={`${inputClass} sm:w-56`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : !incomes || incomes.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No income found"
            description="Add your first entry to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => {
                  const Icon = getIcon(income.category.icon);
                  return (
                    <tr
                      key={income.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
                    >
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                          {income.description}
                          {income.recurringId && (
                            <span title="Recurring entry">
                              <Repeat className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                            </span>
                          )}
                        </p>
                        {income.notes && (
                          <p className="mt-0.5 text-xs text-neutral-400">{income.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${income.category.color}18`,
                            color: income.category.color,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {income.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{formatDate(income.date)}</td>
                      <td className="px-4 py-3 text-right font-medium text-good">
                        +{formatMoney(income.amount, income.currency)}
                        {income.currency !== baseCurrency && (
                          <span className="ml-1.5 text-xs font-normal text-neutral-400">
                            ({formatMoney(income.amountBase, baseCurrency)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalState({ open: true, income })}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(income)}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-critical/10 hover:text-critical"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Total ({incomes.length})
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-good">
                    +{formatMoney(total, baseCurrency)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {modalState.open && (
        <IncomeFormModal income={modalState.income} onClose={() => setModalState({ open: false })} />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          income={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteIncome.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
            toast("Income deleted.");
          }}
          pending={deleteIncome.isPending}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  income,
  onCancel,
  onConfirm,
  pending,
}: {
  income: Income;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Delete income?</h2>
        <p className="mt-1.5 text-sm text-neutral-500">
          "{income.description}" will be permanently removed. This can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            style={{ backgroundColor: "#d03b3b" }}
            className="text-white hover:opacity-90"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
