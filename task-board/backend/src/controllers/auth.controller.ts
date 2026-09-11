import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { getRefreshCookie, setRefreshCookie, clearRefreshCookie } from '../utils/cookies.js';
import { verifyRefreshToken } from '../utils/jwt.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    // Set refresh token as HTTP-only cookie for security
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    // Set refresh token as HTTP-only cookie for security
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const token = refreshToken || getRefreshCookie(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No refresh token provided',
        errorCode: 'NO_REFRESH',
      });
      return;
    }
    const result = await authService.refresh(token);
    // Set new refresh token as HTTP-only cookie
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    // Get token from cookie if not provided in body (for backward compatibility)
    const token = refreshToken || getRefreshCookie(req);
    if (token && req.userId) {
      try {
        const payload = verifyRefreshToken(token);
        await authService.revokeRefresh(req.userId, payload.jti);
      } catch {
        // Token invalid/expired; still clear cookie and return success
      }
    }
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthenticated',
        errorCode: 'UNAUTHENTICATED',
      });
      return;
    }
    const user = await authService.getPublicUser(req.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'NOT_FOUND',
      });
      return;
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}