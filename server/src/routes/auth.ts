import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../prisma";
import {
  clearAuthCookie,
  createSession,
  getSessionIdFromRequest,
  requireAuth,
  setAuthCookie,
  signPending2faToken,
  verifyPending2faToken,
  uid,
  sid,
} from "../auth";

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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

function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

async function issueSession(res: import("express").Response, userId: string, userAgent: string | undefined) {
  const token = await createSession(userId, userAgent);
  setAuthCookie(res, token);
}

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

  await issueSession(res, user.id, req.headers["user-agent"]);
  res.status(201).json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: false });
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockingOut = attempts >= MAX_LOGIN_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingOut ? 0 : attempts,
        lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    if (lockingOut) {
      return res
        .status(429)
        .json({ error: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` });
    }
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  if (user.twoFactorEnabled) {
    return res.json({ requires2FA: true, pendingToken: signPending2faToken(user.id) });
  }

  await issueSession(res, user.id, req.headers["user-agent"]);
  res.json({ id: user.id, email: user.email, name: user.name, twoFactorEnabled: false });
});

router.post("/2fa/login-verify", async (req, res) => {
  const parsed = z
    .object({
      pendingToken: z.string(),
      code: z.string().min(6).max(6).optional(),
      recoveryCode: z.string().min(1).optional(),
    })
    .refine((d) => d.code || d.recoveryCode, { message: "Provide a code or recovery code" })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = verifyPending2faToken(parsed.data.pendingToken);
  if (!userId) return res.status(401).json({ error: "Login session expired, please sign in again" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(401).json({ error: "Two-factor authentication is not set up for this account" });
  }

  if (parsed.data.recoveryCode) {
    const candidates = await prisma.recoveryCode.findMany({ where: { userId, usedAt: null } });
    const match = await findRecoveryCodeMatch(candidates, parsed.data.recoveryCode);
    if (!match) return res.status(400).json({ error: "Invalid or already-used recovery code" });
    await prisma.recoveryCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
  } else {
    const valid = authenticator.verify({ token: parsed.data.code!, secret: user.twoFactorSecret });
    if (!valid) return res.status(400).json({ error: "Invalid or expired code" });
  }

  const recoveryCodesRemaining = await prisma.recoveryCode.count({ where: { userId, usedAt: null } });

  await issueSession(res, user.id, req.headers["user-agent"]);
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    twoFactorEnabled: true,
    recoveryCodesRemaining,
  });
});

async function findRecoveryCodeMatch(
  candidates: { id: string; codeHash: string }[],
  plaintext: string
) {
  const normalized = plaintext.trim().toUpperCase();
  for (const candidate of candidates) {
    if (await bcrypt.compare(normalized, candidate.codeHash)) return candidate;
  }
  return null;
}

router.post("/logout", async (req, res) => {
  // Best-effort: if the cookie is already stale/invalid, still succeed and
  // clear it client-side rather than 401ing on a logout request.
  const sessionId = getSessionIdFromRequest(req);
  if (sessionId) await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  clearAuthCookie(res);
  res.status(204).send();
});

// Everything below this line requires an authenticated session. Applying
// requireAuth via router.use (rather than inline per-route) keeps Express's
// per-route :param inference intact for the handlers that follow.
router.use(requireAuth);

router.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const recoveryCodesRemaining = user.twoFactorEnabled
    ? await prisma.recoveryCode.count({ where: { userId: user.id, usedAt: null } })
    : 0;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    twoFactorEnabled: user.twoFactorEnabled,
    recoveryCodesRemaining,
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

router.put("/password", async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).send();
});

// --- Active sessions ---

router.get("/sessions", async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: uid(req) },
    orderBy: { lastActiveAt: "desc" },
  });
  const currentSessionId = sid(req);
  res.json(
    sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      current: s.id === currentSessionId,
    }))
  );
});

router.delete("/sessions/:id", async (req, res) => {
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, userId: uid(req) },
  });
  if (!session) return res.status(404).json({ error: "Session not found" });

  await prisma.session.delete({ where: { id: session.id } });
  res.status(204).send();
});

router.post("/sessions/revoke-others", async (req, res) => {
  await prisma.session.deleteMany({
    where: { userId: uid(req), id: { not: sid(req) } },
  });
  res.status(204).send();
});

// --- Two-factor authentication ---

router.post("/2fa/setup", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is already enabled" });

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, "WalkThrough", secret);
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, qrCode });
});

router.post("/2fa/verify", async (req, res) => {
  const parsed = z.object({ secret: z.string().min(1), code: z.string().min(6).max(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const valid = authenticator.verify({ token: parsed.data.code, secret: parsed.data.secret });
  if (!valid) return res.status(400).json({ error: "Invalid code. Check your authenticator app and try again." });

  const userId = uid(req);
  const codes = generateRecoveryCodes();
  const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorSecret: parsed.data.secret },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({
      data: hashed.map((codeHash) => ({ userId, codeHash })),
    }),
  ]);

  res.json({ enabled: true, recoveryCodes: codes });
});

router.post("/2fa/disable", async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);
  res.status(204).send();
});

router.post("/2fa/recovery-codes/regenerate", async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (!user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is not enabled" });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  const codes = generateRecoveryCodes();
  const hashed = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.recoveryCode.createMany({ data: hashed.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);

  res.json({ recoveryCodes: codes });
});

// --- Account deletion ---

router.delete("/account", async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Incorrect password" });

  await prisma.user.delete({ where: { id: user.id } });
  clearAuthCookie(res);
  res.status(204).send();
});

export default router;
