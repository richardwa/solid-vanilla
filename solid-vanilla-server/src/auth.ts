import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { allowedUser } from "./allowed-users.ts";

// Basic auth backed by Linux system users (PAM accounts). Credentials are
// validated once via POST {apiPath}/login; the client keeps them in
// localStorage and sends an Authorization: Basic header on every API call.
// The server stays stateless — no sessions, no cookies.
//
// A login/password pair is accepted when:
//   1. the login exists on the system (`getent passwd <login>`), and
//   2. the password verifies against the account — checked by running
//      `su -c true <login>` inside a pseudo-tty (via `script`) with the
//      password piped to it, i.e. the same code path a real login uses.
//
// Notes:
//   - The server process must run as a NON-ROOT user. As root, `su` accepts
//     any password, which would disable the password check entirely.
//   - Optional: set AUTH_GROUP to restrict logins to members of that system
//     group (e.g. AUTH_GROUP=app-users), or AUTH_USERS / AUTH_USERS_FILE to
//     restrict logins to an explicit list of acceptable usernames (see
//     allowed-users.ts).
//   - For cookie-session auth instead of client-stored Basic credentials,
//     see sessions.ts and configureApi's auth: "session" mode.
//   - Keeping login/password pairs in the Authorization header is safe over
//     HTTPS; never run API auth over plain HTTP in production.

export const apiPath = "/api";

const execFileP = promisify(execFile);

/** Does a Linux account with this name exist? */
export const userExists = async (login: string): Promise<boolean> => {
  if (!/^[a-z_][a-z0-9_-]*\$?$/i.test(login)) return false;
  try {
    await execFileP("getent", ["passwd", login]);
    return true;
  } catch {
    return false;
  }
};

/** Is the login a member (primary or supplementary) of the named group? */
const inGroup = async (login: string, group: string): Promise<boolean> => {
  try {
    const { stdout } = await execFileP("getent", ["group", group]);
    if (stdout.trimEnd().split(":").slice(3, 4)[0]?.split(",").includes(login))
      return true;
    const { stdout: idOut } = await execFileP("id", ["-Gn", login]);
    return idOut.trim().split(/\s+/).includes(group);
  } catch {
    return false;
  }
};

/** Verify a password against the system account by logging in via pty. */
const suLogin = (login: string, password: string): Promise<boolean> =>
  new Promise((resolve) => {
    const child = execFile(
      "script",
      ["-qec", `su -s /bin/sh -c true -- ${login}`, "/dev/null"],
      { timeout: 10_000 },
      (error) => resolve(!error),
    );
    // `su` reads the password from the pty that `script` allocates; one
    // correct line satisfies it, a wrong one fails after retries.
    child.stdin?.end(`${password}\n`);
  });

/** Validate a login/password pair against Linux system users. */
export const checkCredentials = async (
  login: string,
  password: string,
): Promise<boolean> => {
  if (!password) return false;
  if (!(await allowedUser(login))) return false;
  if (!(await userExists(login))) return false;
  const group = process.env.AUTH_GROUP;
  if (group && !(await inGroup(login, group))) return false;
  return suLogin(login, password);
};

/** Parse an Authorization: Basic header into { login, password }, or null. */
export const parseBasicHeader = (
  header: string | undefined,
): { login: string; password: string } | null => {
  const m = /^Basic (.+)$/i.exec(header ?? "");
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  return { login: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
};
