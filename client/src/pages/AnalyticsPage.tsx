import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { StatTileGridSkeleton, ChartCardSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";

const axisTick = { fill: "#898781", fontSize: 12 };

export function AnalyticsPage() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
  const base = settings?.baseCurrency ?? "USD";

  const { data: summary, isLoading } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: api.analytics.summary,
  });
  const { data: incomeVsExpense } = useQuery({
    queryKey: ["analytics", "income-vs-expense"],
    queryFn: () => api.analytics.incomeVsExpense(6),
  });
  const { data: expenseBreakdown } = useQuery({
    queryKey: ["dashboard", "by-category"],
    queryFn: () => api.dashboard.byCategory(),
  });
  const { data: incomeBreakdown } = useQuery({
    queryKey: ["analytics", "income-by-category"],
    queryFn: () => api.analytics.incomeByCategory(),
  });
  const { data: trend } = useQuery({
    queryKey: ["dashboard", "trend"],
    queryFn: () => api.dashboard.trend(6),
  });

  const hasFlow = incomeVsExpense?.some((p) => p.income > 0 || p.expense > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A complete view of your income, spending, and trends.
        </p>
      </div>

      {isLoading ? (
        <>
          <StatTileGridSkeleton />
          <div className="mb-6">
            <ChartCardSkeleton height={280} />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCardSkeleton height={200} />
            <ChartCardSkeleton height={200} />
          </div>
          <ChartCardSkeleton height={240} />
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Income this month"
              value={formatMoney(summary?.totalIncome ?? 0, base)}
              icon={Wallet}
              tone="good"
            />
            <StatTile
              label="Expenses this month"
              value={formatMoney(summary?.totalExpense ?? 0, base)}
              icon={TrendingDown}
            />
            <StatTile
              label="Net"
              value={formatMoney(summary?.net ?? 0, base)}
              sublabel={summary && summary.net >= 0 ? "Positive cash flow" : "Spending more than earning"}
              tone={summary && summary.net >= 0 ? "good" : "critical"}
              icon={PiggyBank}
            />
            <StatTile
              label="Savings rate"
              value={summary?.savingsRate != null ? `${summary.savingsRate.toFixed(0)}%` : "—"}
              sublabel={summary?.savingsRate != null ? "Of income kept this month" : "No income logged yet"}
              icon={TrendingUp}
            />
          </div>

          <Card className="mb-6">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Income vs. expenses
            </h2>
            {hasFlow ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={incomeVsExpense} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#c3c2b7" }} tick={axisTick} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTick}
                    tickFormatter={(v) => `$${v}`}
                    width={52}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: number, name: string) => [formatMoney(value, base), name]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#0ca30c"
                    activeBar={{ fill: "#088a08" }}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#2a78d6"
                    activeBar={{ fill: "#184f95" }}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#0b0b0b"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No income or expense data yet" height={280} icon={BarChart3} />
            )}
          </Card>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
                Spending by category
              </h2>
              {expenseBreakdown && expenseBreakdown.some((c) => c.spent > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        dataKey="spent"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="#fcfcfb"
                        strokeWidth={2}
                      >
                        {expenseBreakdown.map((entry) => (
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
                    {expenseBreakdown.slice(0, 6).map((c) => (
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

            <Card>
              <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
                Income by category
              </h2>
              {incomeBreakdown && incomeBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={incomeBreakdown}
                        dataKey="earned"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="#fcfcfb"
                        strokeWidth={2}
                      >
                        {incomeBreakdown.map((entry) => (
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
                    {incomeBreakdown.slice(0, 6).map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                        <span className="font-medium text-neutral-500">{formatMoney(c.earned, base)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart label="No income data yet" height={200} icon={PieChartIcon} />
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Expense trend
            </h2>
            {trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No spending data yet" height={240} icon={BarChart3} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyChart({
  label,
  height,
  icon: Icon,
}: {
  label: string;
  height: number;
  icon: typeof BarChart3;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-neutral-400"
      style={{ height }}
    >
      <Icon className="h-6 w-6 text-neutral-300 dark:text-neutral-700" />
      {label}
    </div>
  );
}
