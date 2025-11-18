import express , {Request, Response}from 'express';
const apiRoutes = express.Router();

apiRoutes.get('/hello', (req:Request, res:Response) => {
  res.json({ message: 'Hello from Express inside Vite!' });
});


export {apiRoutes};
