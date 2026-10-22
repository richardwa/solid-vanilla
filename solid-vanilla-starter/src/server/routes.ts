import express, { Server } from "express";
import { getGitLog, getBranches } from "./resources/git";
import { configureApi } from "solid-vanilla-server";
import type { ServerApi } from "../common/interface";

export const configureRoutes = (app: Server) => {
  const serverImpl: ServerApi = {
    gitBranches: getBranches,
    gitLogs: getGitLog,
  };
  // logger, /api/login, basic-auth middleware and the JSON dispatch come
  // from solid-vanilla-server; credentials come from users.yaml
  configureApi(app, { serverImpl });
};
