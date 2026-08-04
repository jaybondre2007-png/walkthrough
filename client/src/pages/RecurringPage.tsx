import { useState } from "react";
import { Plus, Pencil, Trash2, Pause, Play, Repeat } from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { RecurringFormModal } from "../components/RecurringFormModal";
import { EmptyState } from "../components/EmptyState";
import { TableSkeleton } from "../components/Skeleton";
import { useDeleteRecurring, useRecurring, useUpdateRecurring } from "../hooks/useRecurring";
import { formatDate, formatMoney } from "../lib/format";
import { getIcon } from "../lib/icons";
import { useToast } from "../lib/ToastContext";
import type { RecurringFrequency, RecurringTransaction } from "../lib/types";

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function RecurringPage() {
  const { data: rules, isLoading } = useRecurring();
  const updateRecurring = useUpdateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const { toast } = useToast();

  const [modalState, setModalState] = useState<{ open: boolean; rule?: RecurringTransaction }>({
    open: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Recurring</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Bills, subscriptions, salary — anything that repeats gets logged automatically.
          </p>
        </div>
        <Button onClick={() => setModalState({ open: true })}>
          <Plus className="h-4 w-4" />
          New recurring entry
        </Button>
      </div>

      <Card padded={false} className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : !rules || rules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring entries yet"
            description="Add rent, a subscription, or your salary to stop re-entering it every month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Repeats</th>
                  <th className="px-4 py-3 font-medium">Next occurrence</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const Icon = getIcon(rule.category.icon);
                  const isIncome = rule.kind === "INCOME";
                  return (
                    <tr
                      key={rule.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {rule.description}
                          </p>
                          {!rule.active && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                              Paused
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${rule.category.color}18`,
                            color: rule.category.color,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {rule.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Repeat className="h-3.5 w-3.5" />
                          {FREQUENCY_LABEL[rule.frequency]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {rule.active ? formatDate(rule.nextRunDate) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          isIncome ? "text-good" : "text-neutral-900 dark:text-white"
                        }`}
                      >
                        {isIncome ? "+" : ""}
                        {formatMoney(rule.amount, rule.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              updateRecurring.mutate(
                                { id: rule.id, data: { active: !rule.active } },
                                {
                                  onSuccess: () =>
                                    toast(rule.active ? "Recurring entry paused." : "Recurring entry resumed."),
                                }
                              );
                            }}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            aria-label={rule.active ? "Pause" : "Resume"}
                            title={rule.active ? "Pause" : "Resume"}
                          >
                            {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setModalState({ open: true, rule })}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(rule)}
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
            </table>
          </div>
        )}
      </Card>

      {modalState.open && (
        <RecurringFormModal rule={modalState.rule} onClose={() => setModalState({ open: false })} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Delete recurring entry?
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              "{deleteTarget.description}" will stop repeating. Entries already logged from it stay
              in your history.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#d03b3b" }}
                className="text-white hover:opacity-90"
                disabled={deleteRecurring.isPending}
                onClick={async () => {
                  await deleteRecurring.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                  toast("Recurring entry deleted.");
                }}
              >
                {deleteRecurring.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
