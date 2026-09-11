import type { Request, Response } from 'express';
import { env } from '../config/env.js';

const isProd = env.nodeEnv === 'production';
const REFRESH_COOKIE = 'tb_refresh';
const CSRF_COOKIE = 'tb_csrf';

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

export function getRefreshCookie(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE];
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export function getCsrfCookie(req: Request): string | undefined {
  return req.cookies?.[CSRF_COOKIE];
}