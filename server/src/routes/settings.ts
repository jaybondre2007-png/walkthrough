import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, uid } from "../auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = uid(req);
  const settings = await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  res.json(settings);
});

const settingsUpdateSchema = z.object({
  baseCurrency: z.string().length(3).optional(),
  monthlyBudget: z.number().positive().nullable().optional(),
  budgetLabel: z.enum(["BUDGET", "GOAL"]).optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  budgetAlertThreshold: z.number().int().min(1).max(100).optional(),
});

router.put("/", async (req, res) => {
  const parsed = settingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const settings = await prisma.settings.upsert({
    where: { userId },
    update: parsed.data,
    create: { userId, ...parsed.data },
  });
  res.json(settings);
});

router.get("/exchange-rates", async (req, res) => {
  const rates = await prisma.exchangeRate.findMany({
    where: { userId: uid(req) },
    orderBy: { currency: "asc" },
  });
  res.json(rates);
});

router.put("/exchange-rates/:currency", async (req, res) => {
  const parsed = z.object({ rateToBase: z.number().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const currency = req.params.currency.toUpperCase();
  const userId = uid(req);
  const rate = await prisma.exchangeRate.upsert({
    where: { userId_currency: { userId, currency } },
    update: { rateToBase: parsed.data.rateToBase },
    create: { userId, currency, rateToBase: parsed.data.rateToBase },
  });
  res.json(rate);
});

router.delete("/exchange-rates/:currency", async (req, res) => {
  const userId = uid(req);
  const currency = req.params.currency.toUpperCase();
  const existing = await prisma.exchangeRate.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  if (!existing) return res.status(404).json({ error: "Exchange rate not found" });

  await prisma.exchangeRate.delete({ where: { userId_currency: { userId, currency } } });
  res.status(204).send();
});

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"];

router.get("/live-rates", async (req, res) => {
  const userId = uid(req);
  const settings = await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const base = settings.baseCurrency;
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== base);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols.join(",")}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);
    const data = (await upstream.json()) as { date: string; rates: Record<string, number> };

    // Upstream gives "1 base = X currency"; we store "1 currency = X base", so invert.
    const rates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(data.rates)) {
      if (rate > 0) rates[currency] = Math.round((1 / rate) * 1e6) / 1e6;
    }

    res.json({ base, date: data.date, rates });
  } catch {
    res.status(502).json({ error: "Couldn't reach the exchange rate provider. Please try again shortly." });
  }
});

router.post("/reset-data", async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = uid(req);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { userId } }),
    prisma.income.deleteMany({ where: { userId } }),
    prisma.category.updateMany({ where: { userId }, data: { budget: null } }),
    prisma.settings.upsert({
      where: { userId },
      update: { monthlyBudget: null, budgetAlertsEnabled: true, budgetAlertThreshold: 50 },
      create: { userId },
    }),
  ]);

  res.status(204).send();
});

export default router;
