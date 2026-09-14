import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const connectionString = env.databaseUrl;
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.warn('[pg.Pool] Stale/idle connection warning:', err?.message || err);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function connectDb(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}