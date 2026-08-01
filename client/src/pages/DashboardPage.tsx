import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, TrendingDown, PiggyBank, Receipt as ReceiptIcon, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { BudgetAlertBanner } from "../components/BudgetAlertBanner";
import { GoalCard } from "../components/GoalCard";
import { GoalFormModal } from "../components/GoalFormModal";
import { EmptyState } from "../components/EmptyState";
import { Skeleton, StatTileGridSkeleton, ChartCardSkeleton, ListSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { formatDate, formatMoney, getFirstName } from "../lib/format";
import { getIcon } from "../lib/icons";
import { useAuth } from "../lib/AuthContext";

const axisTick = { fill: "#898781", fontSize: 12 };

export function DashboardPage() {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: api.dashboard.summary,
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const { data: breakdown } = useQuery({
    queryKey: ["dashboard", "by-category"],
    queryFn: () => api.dashboard.byCategory(),
  });
  const { data: trend } = useQuery({
    queryKey: ["dashboard", "trend"],
    queryFn: () => api.dashboard.trend(6),
  });

  const base = summary?.baseCurrency ?? "USD";
  const budgetLabel = settings?.budgetLabel ?? "BUDGET";
  const noun = budgetLabel === "GOAL" ? "Goal" : "Budget";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Hello, {user ? getFirstName(user) : "there"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Here's how your spending looks this month.
        </p>
      </div>

      {isLoading ? (
        <>
          <Card className="mb-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </Card>
          <StatTileGridSkeleton />
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartCardSkeleton height={260} />
            </div>
            <div className="lg:col-span-2">
              <ChartCardSkeleton height={200} />
            </div>
          </div>
          <Card padded={false}>
            <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <Skeleton className="h-4 w-32" />
            </div>
            <ListSkeleton rows={4} />
          </Card>
        </>
      ) : (
        <>
          <BudgetAlertBanner baseCurrency={base} label={budgetLabel} onAdjust={() => setShowGoalModal(true)} />

          <GoalCard
            monthlyBudget={settings?.monthlyBudget ?? null}
            spent={summary?.totalThisMonth ?? 0}
            baseCurrency={base}
            label={budgetLabel}
            onEdit={() => setShowGoalModal(true)}
          />

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Spent this month"
              value={formatMoney(summary?.totalThisMonth ?? 0, base)}
              sublabel={`${summary?.expenseCountThisMonth ?? 0} transactions`}
              icon={Wallet}
            />
            <StatTile
              label={`${noun} remaining`}
              value={
                summary?.budgetRemaining != null
                  ? formatMoney(summary.budgetRemaining, base)
                  : `No ${noun.toLowerCase()} set`
              }
              sublabel={
                summary?.budgetRemaining != null
                  ? summary.budgetRemaining < 0
                    ? `Over ${noun.toLowerCase()}`
                    : "On track"
                  : undefined
              }
              tone={
                summary?.budgetRemaining != null
                  ? summary.budgetRemaining < 0
                    ? "critical"
                    : "good"
                  : "neutral"
              }
              icon={PiggyBank}
            />
            <StatTile
              label="Top category"
              value={summary?.topCategory?.name ?? "—"}
              sublabel={
                summary?.topCategory ? formatMoney(summary.topCategory.amount, base) : undefined
              }
              icon={TrendingDown}
            />
            <StatTile
              label={`Total ${noun.toLowerCase()}`}
              value={summary?.totalBudget ? formatMoney(summary.totalBudget, base) : `No ${noun.toLowerCase()} set`}
              sublabel={`Your monthly ${noun.toLowerCase()}`}
              icon={ReceiptIcon}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
                Monthly spend
              </h2>
              {trend && trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#c3c2b7" }} tick={axisTick} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={axisTick}
                      tickFormatter={(v) => `$${v}`}
                      width={48}
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => formatMoney(value, base)}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
                    />
                    <Bar
                      dataKey="total"
                      name="Spent"
                      fill="#2a78d6"
                      activeBar={{ fill: "#184f95" }}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No spending data yet" height={260} icon={BarChart3} />
              )}
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
                Spending by category
              </h2>
              {breakdown && breakdown.some((c) => c.spent > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={breakdown}
                        dataKey="spent"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="#fcfcfb"
                        strokeWidth={2}
                      >
                        {breakdown.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [formatMoney(value, base), name]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {breakdown.slice(0, 6).map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-medium text-neutral-500">{formatMoney(c.spent, base)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart label="No spending data yet" height={200} icon={PieChartIcon} />
              )}
            </Card>
          </div>

          <Card padded={false}>
            <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Recent expenses
              </h2>
            </div>
            {summary?.recentExpenses.length ? (
              <div>
                {summary.recentExpenses.map((expense) => {
                  const Icon = getIcon(expense.category.icon);
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between border-b border-neutral-100 px-6 py-3 last:border-0 dark:border-neutral-900"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${expense.category.color}18`,
                            color: expense.category.color,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {expense.description}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {expense.category.name} · {formatDate(expense.date)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatMoney(expense.amount, expense.currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={ReceiptIcon}
                title="No expenses yet"
                description="Head to the Expenses page to add your first one."
              />
            )}
          </Card>
        </>
      )}

      {showGoalModal && <GoalFormModal onClose={() => setShowGoalModal(false)} />}
    </div>
  );
}

function EmptyChart({
  label,
  height,
  icon,
}: {
  label: string;
  height: number;
  icon: typeof BarChart3;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-sm text-neutral-400" style={{ height }}>
      {(() => {
        const Icon = icon;
        return <Icon className="h-6 w-6 text-neutral-300 dark:text-neutral-700" />;
      })()}
      {label}
    </div>
  );
}
