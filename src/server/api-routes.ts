import express, { Request, Response } from 'express';
import { type ServerApi } from '../common/interface'
import { getGitLog, getBranches } from './resources/git';
const routes = express.Router();


const serverImpl: ServerApi = {
  gitBranches: getBranches,
  gitLogs: getGitLog
}

Object.entries(serverImpl).forEach(([key, fn]) => {
  routes.post(`/${key}`, async (req: Request, res: Response) => {
    // @ts-ignore
    const reqParams = req.body ?? [];
    // @ts-ignore
    const result =  await fn(...reqParams);
    res.json(result);
  });
})

export { routes };
