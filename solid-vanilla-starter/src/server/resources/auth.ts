import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

// Basic auth. Every /api call carries an Authorization: Basic header; the
// client keeps the credentials in localStorage after /api/login (see
// solid-vanilla-ui's auth module). No sessions, no cookies.
//
// Users come from users.yaml (re-read when its mtime changes — edits apply
// without a restart):
//
//   users:
//     alice:
//       password: "alice"                # plain text, or "sha256:<hex>"
//       # echo -n 'secret' | sha256sum   # for the hash (-n: no trailing \n)

type UserConfig = { password?: string };
type UsersConfig = { users?: Record<string, UserConfig> };

export const usersFile = (): string =>
  process.env.USERS_FILE
    ? path.resolve(process.env.USERS_FILE)
    : path.join(process.cwd(), "users.yaml");

let cache: { mtimeMs: number; config: UsersConfig } | null = null;

const loadUsers = async (): Promise<UsersConfig> => {
  try {
    const stat = await fs.stat(usersFile());
    if (cache?.mtimeMs === stat.mtimeMs) return cache.config;
    const text = await fs.readFile(usersFile(), "utf8");
    const config = (parse(text) ?? {}) as UsersConfig;
    cache = { mtimeMs: stat.mtimeMs, config };
    return config;
  } catch (error) {
    console.error(`[auth] cannot read ${usersFile()}: ${error}`);
    return {};
  }
};

const digest = (value: string): Buffer =>
  crypto.createHash("sha256").update(value).digest();

const passwordMatches = (
  stored: string | undefined,
  given: string,
): boolean => {
  if (!stored) return false;
  const expected = stored.startsWith("sha256:")
    ? Buffer.from(stored.slice(7), "hex")
    : digest(stored);
  if (expected.length !== 32) return false;
  return crypto.timingSafeEqual(expected, digest(given));
};

/** Validate a login/password pair against users.yaml. */
export const checkCredentials = async (
  login: string,
  password: string,
): Promise<boolean> => {
  const { users } = await loadUsers();
  const cfg = users?.[login];
  return !!cfg && passwordMatches(cfg.password, password);
};

const unauthorized = (res: Response) => {
  res.status(401).json({ error: "not authenticated" });
};

/** Express middleware: validate the Basic auth header. */
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const m = /^Basic (.+)$/i.exec(req.headers.authorization ?? "");
  if (!m) return unauthorized(res);
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return unauthorized(res);
  void (async () => {
    if (await checkCredentials(decoded.slice(0, sep), decoded.slice(sep + 1)))
      next();
    else unauthorized(res);
  })();
};
