import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const connectionString = env.databaseUrl;
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.warn('[pg.Pool] Stale/idle connection warning:', err?.message || err);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function connectDb(): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('[db] connected');
      return;
    } catch (err: any) {
      console.warn(`[db] connection attempt ${attempt}/${maxRetries} failed: ${err?.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
