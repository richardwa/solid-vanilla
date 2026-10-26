import { execFile } from "node:child_process";
import http from "node:http";
import { promisify } from "node:util";

// Basic auth backed by Linux system users (PAM accounts). Credentials are
// validated once via POST {apiPath}/login; the client keeps them in
// localStorage and sends an Authorization: Basic header on every API call.
// The server stays stateless — no sessions, no cookies.
//
// Password verification is delegated to the local password-validator service
// (an HTTP server on a unix socket) so this process never needs to run `su`
// itself. The service checks the password the same way a real login does and
// applies its own users.conf allowlist and rate limiting.
//
// A login/password pair is accepted when:
//   1. it passes the local checks here (optional AUTH_GROUP membership), and
//   2. the validator service on AUTH_VALIDATOR_SOCKET (default
//      /home/my-auth-store/validator.sock) reports { "valid": true }.
//
// Notes:
//   - The socket must be reachable by this process' user (world-accessible
//     mode 0666, or shared via SOCKET_GROUP when starting the validator).
//   - Optional: set AUTH_GROUP to restrict logins to members of that system
//     group (e.g. AUTH_GROUP=app-users).
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

/** Unix socket of the password-validator service (see my-auth-store). */
const VALIDATOR_SOCKET =
  process.env.AUTH_VALIDATOR_SOCKET ?? "/home/my-auth-store/validator.sock";

/** Ask the validator service over its unix socket; false on any failure. */
const validatorCheck = (login: string, password: string): Promise<boolean> =>
  new Promise((resolve) => {
    const body = JSON.stringify({ username: login, password });
    const req = http.request(
      {
        socketPath: VALIDATOR_SOCKET,
        path: "/validate",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString()) as {
              valid?: boolean;
            };
            resolve(res.statusCode === 200 && parsed.valid === true);
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end(body);
  });

/** Validate a login/password pair against Linux system users. */
export const checkCredentials = async (
  login: string,
  password: string,
): Promise<boolean> => {
  if (!password) return false;
  const group = process.env.AUTH_GROUP;
  if (group && !(await inGroup(login, group))) return false;
  return validatorCheck(login, password);
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
