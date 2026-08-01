import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { convertToBase } from "../currency";
import { requireAuth, uid } from "../auth";

const router = Router();
router.use(requireAuth);

const MAX_CATCHUP_RUNS = 60;

function addPeriod(date: Date, frequency: string): Date {
  const next = new Date(date);
  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    // MONTHLY — clamp to the last day of the target month so e.g. Jan 31 -> Feb 28/29.
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, daysInMonth));
  }
  return next;
}

const recurringSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  categoryId: z.string().min(1),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

/** Creates any due occurrences (expense/income rows) for one active rule,
 * advancing nextRunDate as it goes. Capped so a rule with a very old
 * startDate can't generate an unbounded backlog in one pass. */
async function catchUpRule(rule: {
  id: string;
  userId: string;
  kind: string;
  description: string;
  amount: number;
  currency: string;
  categoryId: string;
  frequency: string;
  nextRunDate: Date;
  endDate: Date | null;
  notes: string | null;
}) {
  const now = new Date();
  let nextRunDate = rule.nextRunDate;
  let runs = 0;

  while (nextRunDate <= now && runs < MAX_CATCHUP_RUNS) {
    if (rule.endDate && nextRunDate > rule.endDate) break;

    const amountBase = await convertToBase(rule.userId, rule.amount, rule.currency);
    const data = {
      userId: rule.userId,
      description: rule.description,
      amount: rule.amount,
      currency: rule.currency,
      amountBase,
      date: nextRunDate,
      notes: rule.notes,
      categoryId: rule.categoryId,
      recurringId: rule.id,
    };

    if (rule.kind === "EXPENSE") {
      await prisma.expense.create({ data });
    } else {
      await prisma.income.create({ data });
    }

    nextRunDate = addPeriod(nextRunDate, rule.frequency);
    runs++;
  }

  if (runs > 0) {
    const stillActive = !rule.endDate || nextRunDate <= rule.endDate;
    await prisma.recurringTransaction.update({
      where: { id: rule.id },
      data: { nextRunDate, active: stillActive },
    });
  }

  return runs;
}

router.post("/process", async (req, res) => {
  const userId = uid(req);
  const dueRules = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextRunDate: { lte: new Date() } },
  });

  let generated = 0;
  for (const rule of dueRules) {
    generated += await catchUpRule(rule);
  }

  res.json({ generated });
});

router.get("/", async (req, res) => {
  const rules = await prisma.recurringTransaction.findMany({
    where: { userId: uid(req) },
    include: { category: true },
    orderBy: { nextRunDate: "asc" },
  });
  res.json(rules);
});

router.post("/", async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const { kind, categoryId, ...rest } = parsed.data;

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId, kind } });
  if (!category) return res.status(400).json({ error: "Invalid category for this kind" });

  const rule = await prisma.recurringTransaction.create({
    data: {
      ...rest,
      kind,
      categoryId,
      userId,
      nextRunDate: rest.startDate,
    },
    include: { category: true },
  });

  const generated = await catchUpRule(rule);
  const refreshed = await prisma.recurringTransaction.findUnique({
    where: { id: rule.id },
    include: { category: true },
  });

  res.status(201).json({ rule: refreshed, generated });
});

const recurringUpdateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().min(1).optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  endDate: z.coerce.date().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

router.put("/:id", async (req, res) => {
  const parsed = recurringUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const existing = await prisma.recurringTransaction.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Recurring rule not found" });

  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId, kind: existing.kind },
    });
    if (!category) return res.status(400).json({ error: "Invalid category for this kind" });
  }

  const rule = await prisma.recurringTransaction.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { category: true },
  });
  res.json(rule);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: req.params.id, userId: uid(req) },
  });
  if (!existing) return res.status(404).json({ error: "Recurring rule not found" });

  await prisma.recurringTransaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
