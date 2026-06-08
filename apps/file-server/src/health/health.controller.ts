import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — verifies S3/MinIO connectivity' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service or storage unavailable' })
  async check() {
    let storageStatus: 'ok' | 'error' = 'error';
    let storageError: string | undefined;

    try {
      await this.storageService.getMetadata('__health_check_nonexistent__');
      storageStatus = 'ok';
    } catch (err: unknown) {
      const error = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
      if (
        error.name === 'NotFound' ||
        error.Code === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        storageStatus = 'ok';
      } else {
        storageError = String(err);
      }
    }

    return {
      status: storageStatus === 'ok' ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      environment: this.config.get<string>('app.nodeEnv'),
      timestamp: new Date().toISOString(),
      services: {
        storage: storageStatus,
        ...(storageError ? { storageError } : {}),
      },
    };
  }
}
