import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import type Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';
import { ErrorCode } from '../common/types/error-codes.enum';

/** How long a probe may hang before it counts as down. */
const PROBE_TIMEOUT_MS = 2000;

type ServiceState = 'ok' | 'error';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * The deploy gate reads this endpoint, so its status code has to mean something.
   *
   * It used to return a hardcoded `status: 'ok'` with HTTP 200 no matter what the probes
   * found — the service states were reported in the body and contradicted by the code above
   * them. `curl -sf` therefore passed with Postgres on fire, and the only thing the check
   * could still detect was the process not listening at all.
   *
   * The split is deliberate and not symmetric:
   *
   * - **Postgres down → 503.** Nothing meaningful can be served; failing the deploy is right.
   * - **Redis down → 200, `degraded`.** Redis backs OTP, MFA setup and rate limiting, so
   *   sign-in is genuinely broken without it — but content, prayer times and the gallery all
   *   serve fine from Postgres. Making it a 503 would block every future deploy (and drain
   *   the instance out of any load balancer wired to this URL) over an auth outage, which is
   *   a worse failure than the one it reports. The deploy script warns on `degraded` instead.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check — 503 when Postgres is unreachable' })
  @ApiResponse({ status: 200, description: 'Healthy, or degraded (Redis unreachable)' })
  @ApiResponse({ status: 503, description: 'Postgres unreachable' })
  async getHealth(): Promise<Record<string, unknown>> {
    const [database, redis] = await Promise.all([
      this.probe(() => this.dataSource.query('SELECT 1')),
      this.probe(() => this.redis.ping()),
    ]);

    const services = { database, redis };
    const body = {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      services,
    };

    if (database !== 'ok') {
      throw new ServiceUnavailableException({
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Database unreachable',
        details: [services],
      });
    }

    return body;
  }

  /**
   * A probe that hangs is a probe that failed. Without the timeout an unreachable Redis
   * leaves ioredis retrying with backoff and the health request never answers, which reads
   * to the deploy gate as "not listening" rather than "Redis is down".
   */
  private async probe(fn: () => Promise<unknown>): Promise<ServiceState> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        fn(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('probe timeout')), PROBE_TIMEOUT_MS);
          timer.unref();
        }),
      ]);
      return 'ok';
    } catch {
      return 'error';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
