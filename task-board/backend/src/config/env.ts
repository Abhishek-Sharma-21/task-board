import dotenv from 'dotenv';
dotenv.config();

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientUrl: req('CLIENT_URL', 'http://localhost:5173'),
  jwtAccessSecret: req('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: req('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  corsOrigin: req('CORS_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()),
  databaseUrl: req('DATABASE_URL'),
};