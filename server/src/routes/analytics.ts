import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, uid } from "../auth";

const router = Router();
router.use(requireAuth);

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

router.get("/income-vs-expense", async (req, res) => {
  const userId = uid(req);
  const months = Math.min(Number(req.query.months) || 6, 24);
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: from } } }),
    prisma.income.findMany({ where: { userId, date: { gte: from } } }),
  ]);

  const buckets: { key: string; label: string; income: number; expense: number; net: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      income: 0,
      expense: 0,
      net: 0,
    });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  for (const e of expenses) {
    const d = new Date(e.date);
    const bucket = bucketMap.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.expense += e.amountBase;
  }
  for (const i of incomes) {
    const d = new Date(i.date);
    const bucket = bucketMap.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.income += i.amountBase;
  }
  for (const b of buckets) b.net = b.income - b.expense;

  res.json(buckets);
});

router.get("/income-by-category", async (req, res) => {
  const userId = uid(req);
  const { from, to } = req.query as Record<string, string | undefined>;
  const now = new Date();

  const where = {
    userId,
    date: {
      gte: from ? new Date(from) : startOfMonth(now),
      lte: to ? new Date(to) : endOfMonth(now),
    },
  };

  const [incomes, categories] = await Promise.all([
    prisma.income.findMany({ where, include: { category: true } }),
    prisma.category.findMany({ where: { userId, kind: "INCOME" } }),
  ]);

  const totals = new Map<string, number>();
  for (const i of incomes) {
    totals.set(i.categoryId, (totals.get(i.categoryId) ?? 0) + i.amountBase);
  }

  const result = categories
    .map((c) => ({
      categoryId: c.id,
      name: c.name,
      color: c.color,
      earned: totals.get(c.id) ?? 0,
    }))
    .filter((c) => c.earned > 0)
    .sort((a, b) => b.earned - a.earned);

  res.json(result);
});

router.get("/summary", async (req, res) => {
  const userId = uid(req);
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);

  const [monthExpenses, monthIncomes] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: from, lte: to } } }),
    prisma.income.findMany({ where: { userId, date: { gte: from, lte: to } } }),
  ]);

  const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amountBase, 0);
  const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amountBase, 0);

  res.json({
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : null,
  });
});

export default router;
