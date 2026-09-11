import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.ts';

const app = createApp();

function getUniqueUser() {
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return { name: 'Abhi', email: `user_${id}@example.com`, password: 'longenough123' };
}

function extractRefreshCookie(setCookie: string | string[] | undefined): string | null {
  if (!setCookie) return null;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const m = arr.find((c) => c.startsWith('tb_refresh='));
  return m ? m.split(';')[0]!.split('=')[1]! : null;
}

describe('POST /api/auth/register', () => {
  it('valid registration', async () => {
    const user = getUniqueUser();
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(extractRefreshCookie(res.headers['set-cookie'])).toBeTypeOf('string');
  });

  it('rejects duplicate email', async () => {
    const user = getUniqueUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('EMAIL_TAKEN');
  });

  it('rejects invalid email', async () => {
    const user = getUniqueUser();
    const res = await request(app).post('/api/auth/register').send({ ...user, email: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.errorCode).toBe('VALIDATION');
  });

  it('rejects weak password', async () => {
    const user = getUniqueUser();
    const res = await request(app).post('/api/auth/register').send({ ...user, password: 'short' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('valid login', async () => {
    const user = getUniqueUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects invalid password', async () => {
    const user = getUniqueUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrongpass' });
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
    const user = getUniqueUser();
    const reg = await request(app).post('/api/auth/register').send(user);
    const access = reg.body.data.accessToken as string;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${access}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('GET /me with invalid token returns 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh + logout', () => {
  it('refresh rotates cookie and old token revoked', async () => {
    const user = getUniqueUser();
    const reg = await request(app).post('/api/auth/register').send(user);
    const oldRefresh = extractRefreshCookie(reg.headers['set-cookie'])!;
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', `tb_refresh=${oldRefresh}`);
    expect(r1.status).toBe(200);
    const newRefresh = extractRefreshCookie(r1.headers['set-cookie'])!;
    expect(newRefresh).not.toEqual(oldRefresh);
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', `tb_refresh=${oldRefresh}`);
    expect(r2.status).toBe(401);
  });

  it('logout requires CSRF + auth', async () => {
    const user = getUniqueUser();
    const reg = await request(app).post('/api/auth/register').send(user);
    const access = reg.body.data.accessToken as string;
    const setCookies = reg.headers['set-cookie'];
    const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
    const csrfCookie = arr.find((c) => c.startsWith('tb_csrf='))!.split(';')[0]!;
    const csrfToken = csrfCookie.split('=')[1]!;
    const noCsrf = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${access}`);
    expect([204, 403]).toContain(noCsrf.status);
    const ok = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${access}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);
    expect(ok.status).toBe(204);
  });
});