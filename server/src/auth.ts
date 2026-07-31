import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "expensetrac_token";
const TOKEN_TTL = "30d";
const PENDING_2FA_TTL = "5m";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: "session" }, JWT_SECRET, { expiresIn: TOKEN_TTL });
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

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; typ?: string };
    if (payload.typ !== "session") throw new Error("wrong token type");
    req.userId = payload.sub;
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
