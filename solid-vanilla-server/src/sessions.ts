// Cookie-session auth: the client POSTs {apiPath}/login once, the server
// creates a session (random token in an HttpOnly cookie) and the browser
// sends the cookie automatically on every API call afterwards. Sessions
// live in memory and expire after SESSION_TTL_MS. No credentials are kept
// client-side, in contrast to the Basic-auth flow (see auth.ts).
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const COOKIE = "session";
/** 7 days */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Session = { user: string; expires: number };
const sessions = new Map<string, Session>();

const newToken = (): string => crypto.randomBytes(32).toString("hex");

const parseCookies = (req: Request): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0)
      out[part.slice(0, i).trim()] = decodeURIComponent(
        part.slice(i + 1).trim(),
      );
  }
  return out;
};

/** Login name of the session cookie's owner ("" when anonymous/expired). */
export const sessionUser = (req: Request): string => {
  const token = parseCookies(req)[COOKIE];
  if (!token) return "";
  const session = sessions.get(token);
  if (!session) return "";
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return "";
  }
  return session.user;
};

/** Drop one session (used by logout). */
export const endSession = (req: Request): void => {
  const token = parseCookies(req)[COOKIE];
  if (token) sessions.delete(token);
};

const setCookieHeader = (req: Request, value: string, maxAge: number): string =>
  [
    `${COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    ...(req.protocol === "https" ? ["Secure"] : []),
  ].join("; ");

/** Create a session for a verified login and set the cookie. */
export const startSession = (
  req: Request,
  res: Response,
  user: string,
): void => {
  const token = newToken();
  sessions.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
  res.setHeader("Set-Cookie", setCookieHeader(req, token, SESSION_TTL_MS));
};

/** Clear the session cookie. */
export const clearSessionCookie = (req: Request, res: Response): void => {
  endSession(req);
  res.setHeader("Set-Cookie", setCookieHeader(req, "", 0));
};

/** Express middleware: reject requests without a live session with 401. */
export const requireSession = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (sessionUser(req)) return next();
  res.status(401).json({ error: "not authenticated" });
};

/** POST {apiPath}/login body [login, password] → { ok, error? }. Sets the
 *  session cookie on success. Credential checking is the caller's job (the
 *  configureApi check function). */
export const loginHandler =
  (check: (login: string, password: string) => Promise<boolean>) =>
  async (req: Request, res: Response): Promise<void> => {
    const [login, password] =
      (req as Request & { body?: unknown[] }).body ?? [];
    const user = String(login ?? "");
    const ok = await check(user, String(password ?? ""));
    if (ok) startSession(req, res, user);
    res.json({ ok, error: ok ? undefined : "invalid login or password" });
  };

/** POST {apiPath}/logout: drop the session and clear the cookie. */
export const logoutHandler = (req: Request, res: Response): void => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
};

/** GET {apiPath}/me → { user } ("" when anonymous). Lets the client learn
 *  the signed-in user from the session cookie. */
export const meHandler = (req: Request, res: Response): void => {
  res.json({ user: sessionUser(req) });
};
