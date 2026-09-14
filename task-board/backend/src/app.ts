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
import analyticsRouter from './routes/analytics.routes.js';
import taskChatRouter from './routes/taskChat.routes.js';
import { errorHandler, notFound } from './utils/errors.js';

export function createApp(): express.Express {
  const app = express();
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
    ...env.corsOrigin,
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile native apps, curl, Postman (no origin header)
        if (!origin) return callback(null, true);
        // Allow all origins in development mode
        if (env.nodeEnv === 'development') return callback(null, true);
        if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
          return callback(null, true);
        }
        return callback(null, true);
      },
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
  app.use('/api', analyticsRouter);
  app.use('/api', taskChatRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}