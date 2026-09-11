import { beforeAll, afterAll, afterEach } from 'vitest';
import { connectDb, disconnectDb, prisma } from '../src/config/db.js';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_TTL = '5m';
process.env.JWT_REFRESH_TTL = '7d';

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await disconnectDb();
});

afterEach(async () => {
  // Clear tables in reverse order of relationships to prevent foreign key violations
  await prisma.activity.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.boardColumn.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});
});