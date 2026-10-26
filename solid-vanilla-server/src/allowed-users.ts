// Optional allowlist of acceptable login names. The list is "inputted"
// via, in order of precedence:
//   - $AUTH_USERS: comma- or whitespace-separated usernames, e.g.
//     AUTH_USERS="alice,bob carol"
//   - $AUTH_USERS_FILE: path to a text file with one username per line
//     (blank lines and #-comments ignored), re-read on mtime change
//
// When neither is set, any valid account may log in (its password is still
// verified; see auth.ts for the system-user check and AUTH_GROUP).

import fs from "node:fs/promises";
import path from "node:path";

/** True when the login is on the configured allowlist (or none is set). */
export const allowedUser = async (login: string): Promise<boolean> => {
  const env = process.env.AUTH_USERS?.trim();
  if (env) return env.split(/[\s,]+/).includes(login);
  const file = process.env.AUTH_USERS_FILE
    ? path.resolve(process.env.AUTH_USERS_FILE)
    : null;
  if (file) {
    try {
      const text = await fs.readFile(file, "utf8");
      const names = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
      return names.includes(login);
    } catch (error) {
      console.error(`[auth] cannot read ${file}: ${error}`);
      return false;
    }
  }
  return true;
};
