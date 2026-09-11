import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors.js';
import { generateCsrfToken } from '../utils/csrf.js';
import { getCsrfCookie, setCsrfCookie } from '../utils/cookies.js';

/**
 * Issue a CSRF cookie if the client doesn't already have one.
 * Always call this on routes that need CSRF protection, BEFORE the strict check.
 */
export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  const existing = getCsrfCookie(req);
  const token = existing ?? generateCsrfToken();
  setCsrfCookie(res, token);
  // Stash the expected token so the strict check below doesn't have to re-read cookies.
  (req as Request & { csrfToken?: string }).csrfToken = token;
  return next();
}

/**
 * Strict double-submit CSRF check. Only use on authenticated, state-changing routes.
 * Requires the client to have a CSRF cookie AND an `x-csrf-token` header that matches.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const expected = (req as Request & { csrfToken?: string }).csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!expected || typeof headerToken !== 'string' || headerToken !== expected) {
    return next(new HttpError(403, 'CSRF_INVALID', 'CSRF token missing or mismatched'));
  }
  return next();
}

/**
 * Convenience: combine ensure + strict. Use for logout etc.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  ensureCsrfCookie(req, res, (err) => {
    if (err) return next(err);
    requireCsrf(req, res, next);
  });
}