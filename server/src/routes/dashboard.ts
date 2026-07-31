import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, type AuthedRequest } from "../auth";

const router = Router();
router.use(requireAuth);

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

router.get("/summary", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);

  const [monthExpenses, categories, settings] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { category: true },
    }),
    prisma.category.findMany({ where: { userId, kind: "EXPENSE" } }),
    prisma.settings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    }),
  ]);

  const totalThisMonth = monthExpenses.reduce((sum, e) => sum + e.amountBase, 0);
  const totalBudget = categories.reduce((sum, c) => sum + (c.budget ?? 0), 0);

  const spentByCategory = new Map<string, number>();
  for (const e of monthExpenses) {
    spentByCategory.set(e.categoryId, (spentByCategory.get(e.categoryId) ?? 0) + e.amountBase);
  }

  let topCategory: { name: string; amount: number; color: string } | null = null;
  for (const c of categories) {
    const amount = spentByCategory.get(c.id) ?? 0;
    if (amount > 0 && (!topCategory || amount > topCategory.amount)) {
      topCategory = { name: c.name, amount, color: c.color };
    }
  }

  const recentExpenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { category: true },
  });

  res.json({
    baseCurrency: settings.baseCurrency,
    totalThisMonth,
    totalBudget,
    budgetRemaining: totalBudget > 0 ? totalBudget - totalThisMonth : null,
    expenseCountThisMonth: monthExpenses.length,
    topCategory,
    recentExpenses,
  });
});

router.get("/by-category", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { from, to } = req.query as Record<string, string | undefined>;
  const now = new Date();

  const where: Record<string, unknown> = {
    userId,
    date: {
      gte: from ? new Date(from) : startOfMonth(now),
      lte: to ? new Date(to) : endOfMonth(now),
    },
  };

  const expenses = await prisma.expense.findMany({ where, include: { category: true } });
  const categories = await prisma.category.findMany({ where: { userId, kind: "EXPENSE" } });

  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amountBase);
  }

  const result = categories
    .map((c) => ({
      categoryId: c.id,
      name: c.name,
      color: c.color,
      budget: c.budget,
      spent: totals.get(c.id) ?? 0,
    }))
    .filter((c) => c.spent > 0 || c.budget)
    .sort((a, b) => b.spent - a.spent);

  res.json(result);
});

router.get("/trend", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const months = Math.min(Number(req.query.months) || 6, 24);

  const expenses = await prisma.expense.findMany({ where: { userId }, orderBy: { date: "asc" } });

  const bucketMap = new Map<
    string,
    { key: string; label: string; total: number; sortDate: Date }
  >();

  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        key,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        total: 0,
        sortDate: new Date(d.getFullYear(), d.getMonth(), 1),
      });
    }
    bucketMap.get(key)!.total += e.amountBase;
  }

  const buckets = Array.from(bucketMap.values())
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
    .slice(-months)
    .map(({ key, label, total }) => ({ key, label, total }));

  res.json(buckets);
});

router.get("/budget-alert", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  if (!settings.monthlyBudget || !settings.budgetAlertsEnabled) {
    return res.json({ active: false, severity: "none" as const });
  }

  const monthExpenses = await prisma.expense.findMany({
    where: { userId, date: { gte: from, lte: to } },
  });
  const spent = monthExpenses.reduce((sum, e) => sum + e.amountBase, 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = to.getDate();
  const pctTimeElapsed = (dayOfMonth / daysInMonth) * 100;
  const pctSpent = (spent / settings.monthlyBudget) * 100;
  const projectedSpend = (spent / dayOfMonth) * daysInMonth;

  let severity: "none" | "warning" | "critical" = "none";
  if (pctSpent >= 100) {
    severity = "critical";
  } else if (pctSpent >= settings.budgetAlertThreshold && pctSpent > pctTimeElapsed) {
    severity = "warning";
  }

  res.json({
    active: severity !== "none",
    severity,
    monthlyBudget: settings.monthlyBudget,
    spent,
    pctSpent,
    pctTimeElapsed,
    projectedSpend,
    threshold: settings.budgetAlertThreshold,
  });
});

export default router;
