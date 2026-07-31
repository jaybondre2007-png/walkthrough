import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { convertToBase } from "../currency";
import { requireAuth, uid } from "../auth";

const router = Router();
router.use(requireAuth);

const expenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  date: z.coerce.date().optional(),
  notes: z.string().max(1000).nullable().optional(),
  categoryId: z.string().min(1),
});

router.get("/", async (req, res) => {
  const { categoryId, from, to, search } = req.query as Record<string, string | undefined>;
  const userId = uid(req);

  const where: Record<string, unknown> = { userId };
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) where.description = { contains: search };

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });
  res.json(expenses);
});

router.post("/", async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
  });
  if (!category) return res.status(400).json({ error: "Invalid category" });

  const { amount, currency, ...rest } = parsed.data;
  const amountBase = await convertToBase(userId, amount, currency);

  const expense = await prisma.expense.create({
    data: { ...rest, amount, currency, amountBase, userId },
    include: { category: true },
  });
  res.status(201).json(expense);
});

router.put("/:id", async (req, res) => {
  const parsed = expenseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });

  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
    });
    if (!category) return res.status(400).json({ error: "Invalid category" });
  }

  const { amount, currency, ...rest } = parsed.data;

  let amountBase: number | undefined;
  if (amount !== undefined) {
    amountBase = await convertToBase(userId, amount, currency ?? existing.currency);
  }

  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(amount !== undefined ? { amount } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(amountBase !== undefined ? { amountBase } : {}),
    },
    include: { category: true },
  });
  res.json(expense);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: uid(req) },
  });
  if (!existing) return res.status(404).json({ error: "Expense not found" });

  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
