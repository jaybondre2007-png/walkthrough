export type CategoryKind = "EXPENSE" | "INCOME";
export type BudgetLabel = "BUDGET" | "GOAL";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  budget: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number; incomes: number };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  amountBase: number;
  date: string;
  notes: string | null;
  categoryId: string;
  category: Category;
  recurringId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  currency: string;
  amountBase: number;
  date: string;
  notes: string | null;
  categoryId: string;
  category: Category;
  recurringId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringTransaction {
  id: string;
  kind: CategoryKind;
  description: string;
  amount: number;
  currency: string;
  categoryId: string;
  category: Category;
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRate {
  id: string;
  currency: string;
  rateToBase: number;
  updatedAt: string;
}

export interface Settings {
  id: string;
  baseCurrency: string;
  monthlyBudget: number | null;
  budgetLabel: BudgetLabel;
  budgetAlertsEnabled: boolean;
  budgetAlertThreshold: number;
}

export interface DashboardSummary {
  baseCurrency: string;
  budgetLabel: BudgetLabel;
  totalThisMonth: number;
  totalBudget: number;
  budgetRemaining: number | null;
  expenseCountThisMonth: number;
  topCategory: { name: string; amount: number; color: string } | null;
  recentExpenses: Expense[];
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  color: string;
  budget: number | null;
  spent: number;
}

export interface IncomeBreakdown {
  categoryId: string;
  name: string;
  color: string;
  earned: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

export interface IncomeVsExpensePoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  savingsRate: number | null;
}

export interface BudgetAlert {
  active: boolean;
  severity: "none" | "warning" | "critical";
  monthlyBudget?: number;
  spent?: number;
  pctSpent?: number;
  pctTimeElapsed?: number;
  projectedSpend?: number;
  threshold?: number;
}
