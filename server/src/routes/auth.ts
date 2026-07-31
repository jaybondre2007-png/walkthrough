import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../prisma";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signPending2faToken,
  signToken,
  verifyPending2faToken,
  type AuthedRequest,
} from "../auth";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(80).optional(),
});

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food & Dining", kind: "EXPENSE", color: "#eb6834", icon: "Utensils", budget: 500 },
  { name: "Transportation", kind: "EXPENSE", color: "#2a78d6", icon: "Car", budget: 200 },
  { name: "Shopping", kind: "EXPENSE", color: "#e87ba4", icon: "ShoppingBag", budget: 300 },
  { name: "Entertainment", kind: "EXPENSE", color: "#4a3aa7", icon: "Film", budget: 150 },
  { name: "Bills & Utilities", kind: "EXPENSE", color: "#e34948", icon: "Receipt", budget: 400 },
  { name: "Health", kind: "EXPENSE", color: "#008300", icon: "HeartPulse", budget: 150 },
  { name: "Travel", kind: "EXPENSE", color: "#1baf7a", icon: "Plane", budget: 250 },
  { name: "Other", kind: "EXPENSE", color: "#898781", icon: "MoreHorizontal", budget: null },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", kind: "INCOME", color: "#008300", icon: "Wallet", budget: null },
  { name: "Business", kind: "INCOME", color: "#2a78d6", icon: "Briefcase", budget: null },
  { name: "Freelance", kind: "INCOME", color: "#4a3aa7", icon: "Laptop", budget: null },
  { name: "Investment", kind: "INCOME", color: "#1baf7a", icon: "TrendingUp", budget: null },
  { name: "Pocket Money", kind: "INCOME", color: "#eda100", icon: "Coins", budget: null },
  { name: "Gift", kind: "INCOME", color: "#e87ba4", icon: "Gift", budget: null },
  { name: "Other Income", kind: "INCOME", color: "#898781", icon: "MoreHorizontal", budget: null },
];

router.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      settings: { create: { baseCurrency: "USD" } },
      categories: {
        create: [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES],
      },
    },
  });

  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.status(201).json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: false });
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (user.twoFactorEnabled) {
    return res.json({ requires2FA: true, pendingToken: signPending2faToken(user.id) });
  }

  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: false });
});

router.post("/2fa/login-verify", async (req, res) => {
  const parsed = z.object({ pendingToken: z.string(), code: z.string().min(6).max(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = verifyPending2faToken(parsed.data.pendingToken);
  if (!userId) return res.status(401).json({ error: "Login session expired, please sign in again" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(401).json({ error: "Two-factor authentication is not set up for this account" });
  }

  const valid = authenticator.verify({ token: parsed.data.code, secret: user.twoFactorSecret });
  if (!valid) return res.status(400).json({ error: "Invalid or expired code" });

  const token = signToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: true });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: user.twoFactorEnabled });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

router.put("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).send();
});

// --- Two-factor authentication ---

router.post("/2fa/setup", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is already enabled" });

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, "ExpenseTrac", secret);
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, qrCode });
});

router.post("/2fa/verify", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ secret: z.string().min(1), code: z.string().min(6).max(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const valid = authenticator.verify({ token: parsed.data.code, secret: parsed.data.secret });
  if (!valid) return res.status(400).json({ error: "Invalid code. Check your authenticator app and try again." });

  await prisma.user.update({
    where: { id: req.userId! },
    data: { twoFactorEnabled: true, twoFactorSecret: parsed.data.secret },
  });
  res.json({ enabled: true });
});

router.post("/2fa/disable", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  res.status(204).send();
});

export default router;
