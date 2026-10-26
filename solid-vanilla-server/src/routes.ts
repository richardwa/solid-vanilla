import express, { Router } from "express";
import type { NextFunction, Request, Response, Server } from "express";
import { apiPath, checkCredentials, parseBasicHeader } from "./auth.ts";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  requireSession,
  sessionUser,
} from "./sessions.ts";

// Express scaffolding shared by the solid-vanilla apps: request logger,
// POST {apiPath}/login route, auth middleware, and a generic dispatch that
// maps every method of a ServerApi implementation to POST {apiPath}/key
// (parameters and result are JSON-serialized; the types come from the shared
// common/interface.ts so client and server stay in sync).
//
// Two auth flows are supported (see ApiConfig.auth):
//   - "basic" (default): the client keeps credentials in localStorage and
//     sends an Authorization: Basic header (see auth.ts).
//   - "session": the server issues an HttpOnly session cookie at
//     POST {apiPath}/login (see sessions.ts); the browser sends it
//     automatically, nothing is stored client-side.

export type ApiConfig = {
  /** The app's API implementation; each method becomes POST {apiPath}/key. */
  serverImpl: Record<string, (...args: never[]) => Promise<unknown>>;
  /** Credential check used by /api/login and the auth middleware; defaults
   *  to Linux system-user checkCredentials (see auth.ts, which honors the
   *  AUTH_USERS / AUTH_USERS_FILE username allowlist and AUTH_GROUP). */
  checkCredentials?: (login: string, password: string) => Promise<boolean>;
  /** serverImpl keys served WITHOUT requiring authentication; the handler's
   *  first argument is the authenticated login name ("" when anonymous),
   *  so handlers can degrade gracefully or reject writes themselves. */
  anonymous?: string[];
  /** Auth flow: "basic" (default) or "session" (cookie-based). */
  auth?: "basic" | "session";
};

const unauthorized = (res: Response) => {
  res.status(401).json({ error: "not authenticated" });
};

/** Express middleware: validate the Authorization: Basic header. */
export const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const credentials = parseBasicHeader(req.headers.authorization);
  if (!credentials) return unauthorized(res);
  void (async () => {
    const check = req.app.locals
      .checkCredentials as ApiConfig["checkCredentials"];
    if (check && (await check(credentials.login, credentials.password))) next();
    else unauthorized(res);
  })();
};

/** JSON dispatch for one ServerApi method: POST {apiPath}/key calls the
 *  implementation with the deserialized body array as positional args;
 *  when `withUser` the first argument is the authenticated login (""). */
const dispatch =
  (
    fn: (...args: unknown[]) => unknown,
    check: ApiConfig["checkCredentials"],
    withUser: boolean,
  ) =>
  async (req: Request, res: Response) => {
    const reqParams = (req as Request & { body?: unknown[] }).body ?? [];
    try {
      const result = withUser
        ? await (async () => {
            const credentials = parseBasicHeader(req.headers.authorization);
            const user =
              credentials &&
              check &&
              (await check(credentials.login, credentials.password))
                ? credentials.login
                : "";
            return fn(user, ...reqParams);
          })()
        : await fn(...reqParams);
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  };

const internalError = (res: Response, err: unknown) =>
  res
    .status(500)
    .json({ error: err instanceof Error ? err.message : String(err) });

/** Wire logger + login route + auth middleware + API dispatch onto app. */
export const configureApi = (
  app: Server,
  {
    serverImpl,
    checkCredentials: check = checkCredentials,
    anonymous = [],
    auth = "basic",
  }: ApiConfig,
) => {
  // @ts-ignore — express.json() is typed as RequestHandler on Application
  app.use(express.json());
  const logger = (req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  };
  app.use(logger);

  // Anonymous-allowed keys are mounted before the auth middleware; the rest
  // sit behind it.
  const anonRoutes = Router();
  const protectedRoutes = Router();

  if (auth === "session") {
    // Cookie-session mode: login validates credentials and sets the cookie;
    // logout/me act on the cookie; protected routes guard on the session.
    app.post(`${apiPath}/login`, loginHandler(check));
    app.post(`${apiPath}/logout`, logoutHandler);
    app.get(`${apiPath}/me`, meHandler);

    Object.entries(serverImpl).forEach(([key, fn]) => {
      const raw = fn as (...a: unknown[]) => unknown;
      // Anonymous handlers receive the session user as their first arg
      // (mirrors basic mode's injected login); protected handlers get none.
      const handler = anonymous.includes(key)
        ? async (req: Request, res: Response) => {
            const reqParams =
              (req as Request & { body?: unknown[] }).body ?? [];
            try {
              res.json(await raw(sessionUser(req), ...reqParams));
            } catch (err) {
              internalError(res, err);
            }
          }
        : dispatch(raw, check, false);
      (anonymous.includes(key) ? anonRoutes : protectedRoutes).post(
        `/${key}`,
        handler,
      );
    });
    app.use(apiPath, anonRoutes);
    app.use(apiPath, requireSession);
    app.use(apiPath, protectedRoutes);
    return;
  }

  // Validates credentials only; the client keeps them and sends Basic auth.
  app.post(`${apiPath}/login`, async (req: Request, res: Response) => {
    const [login, password] =
      (req as Request & { body?: unknown[] }).body ?? [];
    const ok = await check(String(login ?? ""), String(password ?? ""));
    res.json({ ok, error: ok ? undefined : "invalid login or password" });
  });

  // stash the check for the middleware (app.locals is typed loosely)
  (app.locals as Record<string, unknown>).checkCredentials = check;

  Object.entries(serverImpl).forEach(([key, fn]) => {
    const handler = dispatch(
      fn as (...a: unknown[]) => unknown,
      check,
      anonymous.includes(key),
    );
    (anonymous.includes(key) ? anonRoutes : protectedRoutes).post(
      `/${key}`,
      handler,
    );
  });
  app.use(apiPath, anonRoutes);
  app.use(apiPath, basicAuth);
  app.use(apiPath, protectedRoutes);
};
