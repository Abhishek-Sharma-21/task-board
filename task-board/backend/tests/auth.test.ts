import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';

const app = createApp();

const validUser = { name: 'Abhi', email: 'abhi@example.com', password: 'longenough123' };

function extractRefreshCookie(setCookie: string | string[] | undefined): string | null {
  if (!setCookie) return null;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const m = arr.find((c) => c.startsWith('tb_refresh='));
  return m ? m.split(';')[0]!.split('=')[1]! : null;
}

describe('POST /api/auth/register', () => {
  it('valid registration', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('abhi@example.com');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(extractRefreshCookie(res.headers['set-cookie'])).toBeTypeOf('string');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('EMAIL_TAKEN');
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.errorCode).toBe('VALIDATION');
  });

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, password: 'short' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('valid login', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects invalid password', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/login').send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });
});

describe('Auth-protected routes', () => {
  it('GET /me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me with valid token returns user', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const access = reg.body.data.accessToken as string;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${access}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('abhi@example.com');
  });

  it('GET /me with invalid token returns 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh + logout', () => {
  it('refresh rotates cookie and old token revoked', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const oldRefresh = extractRefreshCookie(reg.headers['set-cookie'])!;
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', `tb_refresh=${oldRefresh}`);
    expect(r1.status).toBe(200);
    const newRefresh = extractRefreshCookie(r1.headers['set-cookie'])!;
    expect(newRefresh).not.toEqual(oldRefresh);
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', `tb_refresh=${oldRefresh}`);
    expect(r2.status).toBe(401);
  });

  it('logout requires CSRF + auth', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const access = reg.body.data.accessToken as string;
    const setCookies = reg.headers['set-cookie'];
    const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
    const csrfCookie = arr.find((c) => c.startsWith('tb_csrf='))!.split(';')[0]!;
    const csrfToken = csrfCookie.split('=')[1]!;
    const noCsrf = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${access}`);
    expect(noCsrf.status).toBe(403);
    const ok = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);
    expect(ok.status).toBe(204);
  });
});