import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
}

function safeSecret(secret: string | undefined, name: string): string {
  if (env.nodeEnv === 'production' && (!secret || secret.length < 16)) {
    throw new Error(name + ' must be set to a strong value in production');
  }
  return secret ?? 'dev-secret';
}

function ttl(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn'];
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, safeSecret(env.jwtAccessSecret, 'JWT_ACCESS_SECRET'), {
    expiresIn: ttl(env.jwtAccessTtl),
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign(
    { sub: userId, jti },
    safeSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET'),
    { expiresIn: ttl(env.jwtRefreshTtl) },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, safeSecret(env.jwtAccessSecret, 'JWT_ACCESS_SECRET'));
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid access token payload');
  }
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, safeSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET'));
  if (typeof decoded === 'string' || !decoded.sub || !decoded.jti) {
    throw new Error('Invalid refresh token payload');
  }
  return decoded as RefreshTokenPayload;
}