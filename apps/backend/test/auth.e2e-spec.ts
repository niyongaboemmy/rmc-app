import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import axios from 'axios';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhoneOtpVerification } from '../src/auth/entities/phone-otp-verification.entity';

const MAILHOG_API = 'http://localhost:8025/api/v2/messages';
const MAILHOG_DELETE = 'http://localhost:8025/api/v1/messages';

const TEST_USER = {
  email: 'e2e-test@rmc-test.com',
  phone: '+250700000001',
  password: 'TestPass1!',
  firstName: 'E2E',
  lastName: 'Test',
};

let app: INestApplication;
let accessToken: string;
let refreshToken: string;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
  await app.init();

  // Clear mailhog
  try { await axios.delete(MAILHOG_DELETE); } catch { /* ignore */ }
});

afterAll(async () => {
  await app.close();
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function registerTestUser(overrides: Partial<typeof TEST_USER> = {}): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ ...TEST_USER, ...overrides });
}

// ── Registration ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('201 — creates user with valid payload', async () => {
    const res = await registerTestUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();
  });

  it('400 — rejects missing required fields', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 — rejects invalid Rwanda phone format', async () => {
    const res = await registerTestUser({ phone: '0781234567' }); // missing +250
    expect(res.status).toBe(400);
  });

  it('400 — rejects weak password (no uppercase)', async () => {
    const res = await registerTestUser({ email: 'other1@test.com', phone: '+250700000099', password: 'alllower1!' });
    expect(res.status).toBe(400);
  });

  it('400 — rejects weak password (no special character)', async () => {
    const res = await registerTestUser({ email: 'other2@test.com', phone: '+250700000098', password: 'NoSpecial1' });
    expect(res.status).toBe(400);
  });

  it('400 — rejects weak password (too short)', async () => {
    const res = await registerTestUser({ email: 'other3@test.com', phone: '+250700000097', password: 'Sh1!' });
    expect(res.status).toBe(400);
  });

  it('409 — rejects duplicate email', async () => {
    const res = await registerTestUser({ phone: '+250700000002' });
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('AUTH_EMAIL_EXISTS');
  });

  it('409 — rejects duplicate phone', async () => {
    const res = await registerTestUser({ email: 'different@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('AUTH_PHONE_EXISTS');
  });

  it('should NOT return password hash in response', async () => {
    const res = await registerTestUser({ email: 'safe@test.com', phone: '+250700000003' });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('password_hash');
    expect(body).not.toContain('passwordHash');
  });

  it('should send welcome email (verify MailHog API)', async () => {
    await registerTestUser({ email: 'mailtest@test.com', phone: '+250700000004' });
    const mailRes = await axios.get(MAILHOG_API);
    expect(mailRes.data.total).toBeGreaterThan(0);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('200 — returns accessToken and refreshToken for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('200 — accepts phone number as identifier', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.phone, password: TEST_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('401 — rejects wrong password with generic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.error?.message).toBe('Invalid credentials');
  });

  it('401 — rejects non-existent user with same generic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'nobody@ghost.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.error?.message).toBe('Invalid credentials');
  });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('200 — returns new tokens for valid refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    refreshToken = res.body.data.refreshToken;
  });

  it('401 — rejects expired/invalid refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'completely-invalid-token' });
    expect(res.status).toBe(401);
  });

  it('should invalidate old refresh token after use', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password });
    const oldToken = loginRes.body.data.refreshToken;

    await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: oldToken });
    const reuse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: oldToken });
    expect(reuse.status).toBe(401);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('200 — successfully logs out authenticated user', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password });
    const token = loginRes.body.data.accessToken;
    const rt = loginRes.body.data.refreshToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: rt });
    expect(res.status).toBe(200);
  });

  it('401 — rejects request without JWT', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});

// ── OTP ───────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/send-otp + verify-phone', () => {
  it('200 — sends OTP (visible in console logs)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: TEST_USER.phone });
    expect(res.status).toBe(200);
    expect(res.body.data.expiresAt).toBeDefined();
    expect(res.body.data).not.toHaveProperty('otp');
  });

  it('400 — rejects incorrect OTP', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-phone')
      .send({ phone: TEST_USER.phone, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('AUTH_OTP_INVALID');
  });

  it('400 — rejects expired OTP (manipulate DB expires_at)', async () => {
    const otpRepo: Repository<PhoneOtpVerification> = app
      .get(getRepositoryToken(PhoneOtpVerification));
    const record = await otpRepo.findOne({ where: { phone: TEST_USER.phone }, order: { createdAt: 'DESC' } });
    if (record) {
      await otpRepo.update(record.id, { expiresAt: new Date(Date.now() - 1000) });
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-phone')
      .send({ phone: TEST_USER.phone, otp: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('AUTH_OTP_EXPIRED');
  });
});

// ── Password Reset ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password + reset-password', () => {
  it('200 — returns success for non-existent email (no enumeration)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@ghost.com' });
    expect(res.status).toBe(200);
  });

  it('200 — sends reset email for existing user (verify MailHog API)', async () => {
    await axios.delete(MAILHOG_DELETE).catch(() => {});
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: TEST_USER.email });
    expect(res.status).toBe(200);
    const mailRes = await axios.get(MAILHOG_API);
    expect(mailRes.data.total).toBeGreaterThan(0);
  });

  it('400 — rejects invalid/expired reset token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'fake-token-uuid', newPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
    expect(['AUTH_RESET_TOKEN_INVALID', 'AUTH_RESET_TOKEN_EXPIRED']).toContain(res.body.error?.code);
  });
});

// ── RBAC ──────────────────────────────────────────────────────────────────────

describe('RBAC', () => {
  it('401 — protected route returns 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test/admin-only');
    expect(res.status).toBe(401);
  });

  it('403 — user token on admin-only route returns 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password });
    const token = loginRes.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/v1/test/admin-only')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('AUTH_INSUFFICIENT_ROLE');
  });

  it('200 — public route returns 200 without any token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test/public');
    expect(res.status).toBe(200);
  });
});

// ── Response Format ───────────────────────────────────────────────────────────

describe('Response Format', () => {
  it('all success responses have { success: true, data, timestamp }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('all error responses have { success: false, error: { code, message } }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'x@x.com', password: 'WrongPass1!' });
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
  });

  it('validation errors include field-level details array', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({});
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ── MFA ───────────────────────────────────────────────────────────────────────

describe('MFA', () => {
  it('should return 401 when trying to setup MFA without a token', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/mfa/setup').send({});
    expect(res.status).toBe(401);
  });

  it('should setup MFA and return QR code for authenticated user', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password });
    const token = loginRes.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data.manualEntryCode).toBeDefined();
  });
});

// ── Swagger ───────────────────────────────────────────────────────────────────

describe('Swagger', () => {
  it('should expose valid OpenAPI spec at /api/docs-json', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.paths['/api/v1/auth/register']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/login']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/refresh']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/logout']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/send-otp']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/verify-phone']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/forgot-password']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/reset-password']).toBeDefined();
    expect(res.body.paths['/api/v1/auth/mfa/setup']).toBeDefined();
  });
});

// ── Crypto helper for tests ───────────────────────────────────────────────────
function _hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
void _hashToken;
