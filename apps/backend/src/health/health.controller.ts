import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import type Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check — returns DB and Redis status' })
  async getHealth(): Promise<Record<string, unknown>> {
    const services: Record<string, string> = {
      database: 'error',
      redis: 'error',
    };

    try {
      await this.dataSource.query('SELECT 1');
      services['database'] = 'ok';
    } catch {
      // database remains 'error'
    }

    try {
      await this.redis.ping();
      services['redis'] = 'ok';
    } catch {
      // redis remains 'error'
    }

    return {
      status: 'ok',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
