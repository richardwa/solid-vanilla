import express, { Request, Response } from 'express';
import { type ServerApi } from '../common/interface'
import { getGitLog, getBranches } from './resources/git';
const routes = express.Router();


const serverImpl: ServerApi = {
  gitBranches: getBranches,
  gitLogs: getGitLog
}



routes.get('/hello', (req:Request, res:Response) => {
  res.json({ message: 'Hello from Express inside Vite!' });
});


export { routes };
