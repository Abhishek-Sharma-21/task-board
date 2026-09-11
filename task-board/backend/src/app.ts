import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter from './routes/auth.routes.js';
import workspaceRouter from './routes/workspace.routes.js';
import projectRouter from './routes/project.routes.js';
import boardRouter from './routes/board.routes.js';
import taskRouter from './routes/task.routes.js';
import commentRouter from './routes/comment.routes.js';
import notificationRouter from './routes/notification.routes.js';
import activityRouter from './routes/activity.routes.js';
import projectMemberRouter from './routes/projectMember.routes.js';
import { errorHandler, notFound } from './utils/errors.js';

export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api', projectRouter);
  app.use('/api', boardRouter);
  app.use('/api', taskRouter);
  app.use('/api', commentRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api', activityRouter);
  app.use('/api', projectMemberRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}