import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, uid } from "../auth";

const router = Router();
router.use(requireAuth);

const categorySchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  icon: z.string().min(1).default("Tag"),
  budget: z.number().nonnegative().nullable().optional(),
});

router.get("/", async (req, res) => {
  const { kind } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = { userId: uid(req) };
  if (kind === "EXPENSE" || kind === "INCOME") where.kind = kind;

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true, incomes: true } } },
  });
  res.json(categories);
});

router.post("/", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, userId: uid(req) },
    });
    res.status(201).json(category);
  } catch {
    res.status(409).json({ error: "A category with this name already exists" });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: uid(req) },
  });
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(category);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: uid(req) },
  });
  if (!existing) return res.status(404).json({ error: "Category not found" });

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
