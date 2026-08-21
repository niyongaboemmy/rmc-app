import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { HealthController } from './health.controller';
import { ErrorCode } from '../common/types/error-codes.enum';

/**
 * The deploy gate in .github/workflows/cd-production.yml reads this endpoint and branches on
 * its status code, so these cases are a contract, not incidental behaviour.
 */
describe('HealthController', () => {
  const build = (db: () => Promise<unknown>, redis: () => Promise<unknown>) =>
    new HealthController(
      { query: db } as unknown as DataSource,
      {
        ping: redis,
      } as unknown as Redis,
    );

  const ok = () => Promise.resolve([{ '?column?': 1 }]);
  const down = () => Promise.reject(new Error('ECONNREFUSED'));
  const hang = () => new Promise<never>(() => {});

  it('reports ok when both probes answer', async () => {
    const res = await build(ok, ok).getHealth();
    expect(res['status']).toBe('ok');
    expect(res['services']).toEqual({ database: 'ok', redis: 'ok' });
  });

  it('stays 200 but degraded when only Redis is down', async () => {
    const res = await build(ok, down).getHealth();
    expect(res['status']).toBe('degraded');
    expect(res['services']).toEqual({ database: 'ok', redis: 'error' });
  });

  it('throws 503 when Postgres is down', async () => {
    await expect(build(down, ok).getHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);

    const err = await build(down, ok)
      .getHealth()
      .catch((e: ServiceUnavailableException) => e);
    const body = (err as ServiceUnavailableException).getResponse() as Record<string, unknown>;
    expect((err as ServiceUnavailableException).getStatus()).toBe(503);
    expect(body['code']).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    // The filter only forwards `details` when it is an array.
    expect(body['details']).toEqual([{ database: 'error', redis: 'ok' }]);
  });

  it('treats a hanging probe as down rather than hanging the request', async () => {
    const res = await build(ok, hang).getHealth();
    expect(res['services']).toEqual({ database: 'ok', redis: 'error' });
  }, 10_000);

  it('serialises so the deploy script can grep the Redis state', async () => {
    const res = await build(ok, down).getHealth();
    expect(JSON.stringify({ success: true, data: res })).toMatch(/"redis": *"error"/);
  });
});
