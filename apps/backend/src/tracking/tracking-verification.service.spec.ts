import { TrackingVerificationService, TrackingSubject } from './tracking-verification.service';

/**
 * The dev OTP bypass exists so a machine with no SMS gateway can still open a
 * tracking session. It is a deliberate hole in an authentication check, so the
 * gate that keeps it out of production is worth pinning down: these tests fail
 * loudly if anyone widens it.
 */
describe('TrackingVerificationService — dev OTP bypass', () => {
  const SUBJECT: TrackingSubject = { id: 'app-1', phone: '+250788000000' };
  const originalEnv = process.env.NODE_ENV;

  /** Builds the service with just enough of its five dependencies stubbed. */
  function build(env: Record<string, string>) {
    const otpRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };
    const sms = { sendSms: jest.fn() };
    const config = { get: jest.fn((k: string, d?: unknown) => env[k] ?? d) };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };

    const service = new TrackingVerificationService(
      otpRepo as never,
      redis as never,
      sms as never,
      config as never,
      jwt as never,
    );
    return { service, otpRepo, redis, sms, jwt };
  }

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('accepts the fixed code when NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development';
    const { service, jwt } = build({ TRACKING_OTP_DEV_CODE: '000000' });

    const out = await service.verifyOtp('hajj_application', SUBJECT, '000000', '127.0.0.1');

    expect(out.subjectId).toBe('app-1');
    expect(jwt.sign).toHaveBeenCalled();
  });

  it('IGNORES the fixed code in production, even when the variable is set', async () => {
    process.env.NODE_ENV = 'production';
    const { service, jwt } = build({ TRACKING_OTP_DEV_CODE: '000000' });

    // No pending OTP record → the normal path rejects it. The point is that it
    // reaches that path at all instead of being short-circuited.
    await expect(
      service.verifyOtp('hajj_application', SUBJECT, '000000', '127.0.0.1'),
    ).rejects.toMatchObject({ response: { code: 'TRACKING_OTP_NONE' } });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('is off when the variable is unset, even outside production', async () => {
    process.env.NODE_ENV = 'development';
    const { service, jwt } = build({});

    await expect(
      service.verifyOtp('hajj_application', SUBJECT, '000000', '127.0.0.1'),
    ).rejects.toMatchObject({ response: { code: 'TRACKING_OTP_NONE' } });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('does not turn into "accept any code" — a non-matching code still fails', async () => {
    process.env.NODE_ENV = 'development';
    const { service, jwt } = build({ TRACKING_OTP_DEV_CODE: '000000' });

    await expect(
      service.verifyOtp('hajj_application', SUBJECT, '123456', '127.0.0.1'),
    ).rejects.toMatchObject({ response: { code: 'TRACKING_OTP_NONE' } });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('still requires a resolvable tracking code (null subject is refused)', async () => {
    process.env.NODE_ENV = 'development';
    const { service, jwt } = build({ TRACKING_OTP_DEV_CODE: '000000' });

    await expect(
      service.verifyOtp('hajj_application', null, '000000', '127.0.0.1'),
    ).rejects.toMatchObject({ response: { code: 'TRACKING_CODE_NOT_FOUND' } });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('keeps failing closed on a Redis outage in production', async () => {
    process.env.NODE_ENV = 'production';
    const { service, redis } = build({});
    redis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      service.verifyOtp('hajj_application', SUBJECT, '000000', '127.0.0.1'),
    ).rejects.toThrow('ECONNREFUSED');
  });

  it('tolerates a Redis outage only while the dev bypass is active', async () => {
    process.env.NODE_ENV = 'development';
    const { service, redis, jwt } = build({ TRACKING_OTP_DEV_CODE: '000000' });
    redis.incr.mockRejectedValue(new Error('ECONNREFUSED'));

    const out = await service.verifyOtp('hajj_application', SUBJECT, '000000', '127.0.0.1');

    expect(out.token).toBe('signed-token');
    expect(jwt.sign).toHaveBeenCalled();
  });
});
