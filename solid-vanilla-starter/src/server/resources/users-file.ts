// Credential check backed by users.yaml (instead of Linux system users).
// File format (re-read on mtime change, no restart needed):
//   users:
//     alice:
//       password: "plain text"
//     bob:
//       # hash of "bob"
//       password: "sha256:<hex sha256 of the password>"
// The YAML is intentionally parsed by hand — the schema is this simple and
// it keeps the starter dependency-free.

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const usersFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../users.yaml",
);

type Entry = { user: string; password: string };

let cache: { mtimeMs: number; users: Map<string, string> } | null = null;

const parseUsers = async (): Promise<Map<string, string>> => {
  const text = await fs.readFile(usersFile, "utf8");
  const users = new Map<string, string>();
  let user: string | null = null;
  for (const line of text.split("\n")) {
    const userMatch = /^\s{2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    const pwMatch = /^\s+password:\s*"([^"]*)"/.exec(line);
    if (userMatch) user = userMatch[1];
    else if (pwMatch && user) {
      users.set(user, pwMatch[1]);
      user = null;
    }
  }
  return users;
};

const loadUsers = async (): Promise<Map<string, string>> => {
  try {
    const stat = await fs.stat(usersFile);
    if (!cache || cache.mtimeMs !== stat.mtimeMs) {
      cache = { mtimeMs: stat.mtimeMs, users: await parseUsers() };
    }
    return cache.users;
  } catch (error) {
    console.error(`[auth] cannot read ${usersFile}: ${error}`);
    return new Map();
  }
};

/** Verify a login/password pair against users.yaml. */
export const checkUsersFile = async (
  login: string,
  password: string,
): Promise<boolean> => {
  const expected = (await loadUsers()).get(login);
  if (!expected || !password) return false;
  if (expected.startsWith("sha256:")) {
    const hash = createHash("sha256").update(password).digest("hex");
    return hash === expected.slice("sha256:".length);
  }
  return expected === password;
};
