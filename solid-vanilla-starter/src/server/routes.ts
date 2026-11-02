import express, { Server } from "express";
import { getGitLog, getBranches } from "./resources/git";
import { configureApi } from "solid-vanilla-server";
import type { ServerApi } from "../common/interface";

export const configureRoutes = (app: Server) => {
  const serverImpl: ServerApi = {
    gitBranches: getBranches,
    gitLogs: getGitLog,
  };
  // logger, /api/login + /api/logout + /api/me, the session middleware and
  // the JSON dispatch come from solid-vanilla-server. This starter accepts
  // any login/password: checkCredentials just returns true (the default
  // would verify Linux system users via PAM; see solid-vanilla-server
  // auth.ts). Session auth: the server issues an HttpOnly cookie, nothing
  // is stored client-side.
  configureApi(app, {
    serverImpl,
    auth: "session",
    checkCredentials: async () => true,
  });
};
