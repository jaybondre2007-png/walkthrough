import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "walkthrough_token";
const TOKEN_TTL = "30d";
const PENDING_2FA_TTL = "5m";

export interface AuthedRequest extends Request {
  userId?: string;
  sessionId?: string;
}

export function signToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, typ: "session" }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

/** Short-lived token issued after password verification when 2FA is enabled,
 * proving the password step passed without yet granting a full session. */
export function signPending2faToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "pending2fa" }, JWT_SECRET, { expiresIn: PENDING_2FA_TTL });
}

export function verifyPending2faToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; typ: string };
    return payload.typ === "pending2fa" ? payload.sub : null;
  } catch {
    return null;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
  });
}

/** Creates a DB-tracked session row and returns the signed cookie token for it.
 * Tracking sessions (rather than trusting the JWT alone) is what makes the
 * "active sessions" list and remote sign-out features actually work — revoking
 * a session here immediately invalidates that token on its next request. */
export async function createSession(userId: string, userAgent: string | undefined) {
  const session = await prisma.session.create({
    data: { userId, userAgent: userAgent?.slice(0, 300) },
  });
  return signToken(userId, session.id);
}

/** `req` is typed as the plain Express `Request` (not `AuthedRequest`) even
 * though we attach userId/sessionId to it — annotating it as AuthedRequest
 * here would defeat per-route params inference for every route this
 * middleware is chained onto, e.g. turning `req.params.id` into
 * `string | string[]`. Handlers read the attached fields via uid()/sid(). */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authedReq = req as AuthedRequest;
  const token = authedReq.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; sid?: string; typ?: string };
    if (payload.typ !== "session" || !payload.sid) throw new Error("wrong token type");

    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Session expired, please log in again" });
    }

    // Best-effort activity heartbeat; failures here shouldn't block the request.
    prisma.session
      .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});

    authedReq.userId = payload.sub;
    authedReq.sessionId = payload.sid;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please log in again" });
  }
}

/** Reads the authenticated user id without widening the handler's `req` type
 * (annotating a route handler's req as AuthedRequest defeats Express's
 * per-route params inference, e.g. turning `req.params.id` into `string | string[]`). */
export function uid(req: Request): string {
  return (req as AuthedRequest).userId!;
}

export function sid(req: Request): string {
  return (req as AuthedRequest).sessionId!;
}

/** Decodes the session id from the cookie without requiring the session to
 * still exist in the DB — used by logout, which must succeed even against a
 * stale/already-revoked token. */
export function getSessionIdFromRequest(req: Request): string | null {
  const token = (req as AuthedRequest).cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sid?: string; typ?: string };
    return payload.typ === "session" && payload.sid ? payload.sid : null;
  } catch {
    return null;
  }
}
