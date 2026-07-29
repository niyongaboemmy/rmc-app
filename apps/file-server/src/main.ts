import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { resolveProtectedPrefixes } from './common/guards/jwt-auth.guard';

/**
 * Every prefix that MUST be JWT-protected. Checked at boot against the list the
 * guard actually resolved.
 *
 * This assertion exists because the failure it catches is silent. If a prefix
 * falls out of the active list — someone sets PROTECTED_KEY_PREFIXES to add one
 * and unknowingly replaces the rest, someone edits the defaults, someone
 * mistypes a trailing slash — then every file under it becomes publicly
 * downloadable by raw URL. No request fails. No error is logged. Nothing looks
 * broken. The only symptom is that private data is served to anyone who asks.
 *
 * All of them are listed, not just the newest, so this catches the mistake
 * whatever introduces it — including a future change that has nothing to do
 * with the prefix being added.
 */
const EXPECTED_PROTECTED_PREFIXES = [
  'hajj-proofs/',
  'funeral-docs/',
  'dawah-library/',
  'tender-applications/',
];

function assertProtectedPrefixes(config: ConfigService, logger: Logger): void {
  const active = resolveProtectedPrefixes(config);
  const missing = EXPECTED_PROTECTED_PREFIXES.filter((p) => !active.includes(p));

  if (missing.length === 0) {
    logger.log(`Protected key prefixes: ${active.join(', ')}`);
    return;
  }

  const banner = '='.repeat(72);
  logger.error(banner);
  logger.error('SECURITY: EXPECTED PROTECTED PREFIXES ARE NOT ACTIVE');
  logger.error(`  missing: ${missing.join(', ')}`);
  logger.error(`  active : ${active.join(', ') || '(none)'}`);
  logger.error('  Files under the missing prefixes are PUBLICLY DOWNLOADABLE by raw URL.');
  logger.error('  Nothing will appear broken. This is a data breach in progress.');
  logger.error('');
  logger.error('  Most likely cause: PROTECTED_KEY_PREFIXES is set and OVERRIDES the');
  logger.error('  code defaults rather than appending to them. It must enumerate ALL');
  logger.error('  prefixes, or be left unset so the defaults apply.');
  logger.error(banner);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('FileServer');

  const port = config.get<number>('app.port') || 3002;
  const nodeEnv = config.get<string>('app.nodeEnv') || 'development';
  const allowedOrigins = config.get<string[]>('app.allowedOrigins') || [];
  const maxFileSize = config.get<number>('app.maxFileSize') || 10 * 1024 * 1024;

  // Before anything is served: confirm the private prefixes are actually private.
  assertProtectedPrefixes(config, logger);

  // crossOriginResourcePolicy must be 'cross-origin' so browsers can read
  // responses from this file-server when the request originates on another
  // port (e.g. Next.js on :3001 uploading to this server on :3002).
  // crossOriginEmbedderPolicy is disabled for the same reason — COEP
  // require-corp would force every sub-resource to opt-in, which breaks
  // cross-origin XHR responses before the client can even read them.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Temporary auth-debug middleware — shows what token (if any) arrives on
  // every non-OPTIONS request so we can diagnose 401 failures quickly.
  app.use((req: { method: string; url: string; headers: Record<string, string> }, _res: unknown, next: () => void) => {
    if (req.method !== 'OPTIONS') {
      const auth = req.headers['authorization'];
      const snippet = auth
        ? auth.substring(0, 30) + (auth.length > 30 ? '…' : '')
        : 'NONE';
      logger.debug(`→ ${req.method} ${req.url}  auth=${snippet}`);
    }
    next();
  });

  app.setGlobalPrefix('api/v1');

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('RMC File Server API')
      .setDescription(
        'Standalone file storage service for the Rwanda Muslim Community Digital Platform. ' +
          'Handles multipart uploads, presigned S3 URLs, and file management.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('files', 'File upload and retrieval endpoints')
      .addTag('health', 'Service health check')
      .addServer(`http://localhost:${port}`, 'Local development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);

  logger.log(`File Server running on http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
  logger.log(`Max upload size: ${(maxFileSize / 1024 / 1024).toFixed(0)} MB`);
  logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
