import express, { Server } from "express";
import { getGitLog, getBranches } from "./resources/git";
import { checkUsersFile } from "./resources/users-file";
import { configureApi } from "solid-vanilla-server";
import type { ServerApi } from "../common/interface";

export const configureRoutes = (app: Server) => {
  const serverImpl: ServerApi = {
    gitBranches: getBranches,
    gitLogs: getGitLog,
  };
  // logger, /api/login + /api/logout + /api/me, the session middleware and
  // the JSON dispatch come from solid-vanilla-server; credentials come
  // from users.yaml (plain or sha256-hashed passwords, re-read on mtime
  // change). Session auth: the server issues an HttpOnly cookie, nothing
  // is stored client-side.
  configureApi(app, {
    serverImpl,
    auth: "session",
    checkCredentials: checkUsersFile,
  });
};
