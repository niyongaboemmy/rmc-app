import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('FileServer');

  const port = config.get<number>('app.port') || 3002;
  const nodeEnv = config.get<string>('app.nodeEnv') || 'development';
  const allowedOrigins = config.get<string[]>('app.allowedOrigins') || [];
  const maxFileSize = config.get<number>('app.maxFileSize') || 10 * 1024 * 1024;

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
