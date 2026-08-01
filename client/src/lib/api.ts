import type {
  AnalyticsSummary,
  BudgetAlert,
  Category,
  CategoryBreakdown,
  CategoryKind,
  DashboardSummary,
  ExchangeRate,
  Expense,
  Income,
  IncomeBreakdown,
  IncomeVsExpensePoint,
  Settings,
  TrendPoint,
} from "./types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`;
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ExpenseInput {
  description: string;
  amount: number;
  currency: string;
  date?: string;
  notes?: string | null;
  categoryId: string;
}

export type IncomeInput = ExpenseInput;

export interface CategoryInput {
  name: string;
  kind?: CategoryKind;
  color: string;
  icon: string;
  budget?: number | null;
}

export interface SettingsInput {
  baseCurrency?: string;
  monthlyBudget?: number | null;
  budgetAlertsEnabled?: boolean;
  budgetAlertThreshold?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  twoFactorEnabled: boolean;
  recoveryCodesRemaining?: number;
}

export interface Session {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

export type LoginResult = AuthUser | { requires2FA: true; pendingToken: string };

export const api = {
  auth: {
    me: () => request<AuthUser>("/auth/me"),
    login: (email: string, password: string) =>
      request<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    verify2faLogin: (pendingToken: string, codeOrRecovery: { code: string } | { recoveryCode: string }) =>
      request<AuthUser>("/auth/2fa/login-verify", {
        method: "POST",
        body: JSON.stringify({ pendingToken, ...codeOrRecovery }),
      }),
    register: (email: string, password: string, name?: string) =>
      request<AuthUser>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    setup2fa: () => request<{ secret: string; qrCode: string }>("/auth/2fa/setup", { method: "POST" }),
    verify2fa: (secret: string, code: string) =>
      request<{ enabled: true; recoveryCodes: string[] }>("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ secret, code }),
      }),
    disable2fa: (password: string) =>
      request<void>("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password }) }),
    regenerateRecoveryCodes: (password: string) =>
      request<{ recoveryCodes: string[] }>("/auth/2fa/recovery-codes/regenerate", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    sessions: {
      list: () => request<Session[]>("/auth/sessions"),
      revoke: (id: string) => request<void>(`/auth/sessions/${id}`, { method: "DELETE" }),
      revokeOthers: () => request<void>("/auth/sessions/revoke-others", { method: "POST" }),
    },
    deleteAccount: (password: string) =>
      request<void>("/auth/account", { method: "DELETE", body: JSON.stringify({ password }) }),
  },
  categories: {
    list: (kind?: CategoryKind) => request<Category[]>(`/categories${kind ? `?kind=${kind}` : ""}`),
    create: (data: CategoryInput) =>
      request<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CategoryInput>) =>
      request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  expenses: {
    list: (params?: { categoryId?: string; from?: string; to?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.categoryId) qs.set("categoryId", params.categoryId);
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      if (params?.search) qs.set("search", params.search);
      const query = qs.toString();
      return request<Expense[]>(`/expenses${query ? `?${query}` : ""}`);
    },
    create: (data: ExpenseInput) =>
      request<Expense>("/expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ExpenseInput>) =>
      request<Expense>(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/expenses/${id}`, { method: "DELETE" }),
  },
  income: {
    list: (params?: { categoryId?: string; from?: string; to?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.categoryId) qs.set("categoryId", params.categoryId);
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      if (params?.search) qs.set("search", params.search);
      const query = qs.toString();
      return request<Income[]>(`/income${query ? `?${query}` : ""}`);
    },
    create: (data: IncomeInput) => request<Income>("/income", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<IncomeInput>) =>
      request<Income>(`/income/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/income/${id}`, { method: "DELETE" }),
  },
  settings: {
    get: () => request<Settings>("/settings"),
    update: (data: SettingsInput) =>
      request<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
    resetData: (password: string) =>
      request<void>("/settings/reset-data", { method: "POST", body: JSON.stringify({ password }) }),
    liveRates: () =>
      request<{ base: string; date: string; rates: Record<string, number> }>("/settings/live-rates"),
    rates: {
      list: () => request<ExchangeRate[]>("/settings/exchange-rates"),
      upsert: (currency: string, rateToBase: number) =>
        request<ExchangeRate>(`/settings/exchange-rates/${currency}`, {
          method: "PUT",
          body: JSON.stringify({ rateToBase }),
        }),
      remove: (currency: string) =>
        request<void>(`/settings/exchange-rates/${currency}`, { method: "DELETE" }),
    },
  },
  dashboard: {
    summary: () => request<DashboardSummary>("/dashboard/summary"),
    byCategory: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const query = qs.toString();
      return request<CategoryBreakdown[]>(`/dashboard/by-category${query ? `?${query}` : ""}`);
    },
    trend: (months = 6) => request<TrendPoint[]>(`/dashboard/trend?months=${months}`),
    budgetAlert: () => request<BudgetAlert>("/dashboard/budget-alert"),
  },
  analytics: {
    summary: () => request<AnalyticsSummary>("/analytics/summary"),
    incomeVsExpense: (months = 6) =>
      request<IncomeVsExpensePoint[]>(`/analytics/income-vs-expense?months=${months}`),
    incomeByCategory: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set("from", params.from);
      if (params?.to) qs.set("to", params.to);
      const query = qs.toString();
      return request<IncomeBreakdown[]>(`/analytics/income-by-category${query ? `?${query}` : ""}`);
    },
  },
};
