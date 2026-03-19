import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import adminAuthRouter from './routes/adminAuth.js';
import adminMembersRouter from './routes/adminMembers.js';
import adminRewardsRouter from './routes/adminRewards.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'https://untitledrun-judge.web.app'
    ],
    credentials: true
  }));

  app.use(cookieParser());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/admin', adminAuthRouter);
  app.use('/admin', adminMembersRouter);
  app.use('/admin', adminRewardsRouter);

  return app;
}