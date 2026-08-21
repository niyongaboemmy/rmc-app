import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /**
   * Rate limiting and the auth audit log both key on the client IP, which behind
   * a reverse proxy is the proxy's own address — every user would share one
   * bucket and lock each other out of login.
   *
   * Trusting blindly is the opposite failure: a client can forge X-Forwarded-For
   * and mint itself a fresh bucket per request, bypassing the limits entirely.
   * So this is the count of proxies actually in front of the app, and it defaults
   * to 0 — correct for direct exposure, and it must be set when deploying behind
   * nginx/Cloudflare/a load balancer.
   */
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  /**
   * JSON body limit. Express defaults to 100 kB, which a legitimate rich-text
   * body overruns: a long lesson/course description with inline images is easily
   * 150-300 kB of HTML. Worse, exceeding the default surfaced as a generic 500
   * rather than a 413, so an admin lost their work to an unexplained error.
   * 2 MB is ample for prose (media itself is uploaded separately, never inlined
   * into JSON) while still bounding the request size.
   */
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Security
  app.use(helmet());
  app.use(
    compression({
      // Don't compress the streaming AI chat response — buffering would defeat
      // token-by-token streaming.
      filter: (req, res) => {
        if (req.path?.includes('/ai/ask')) return false;
        return compression.filter(req, res);
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  const reflector = app.get(Reflector);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor(reflector));

  // Swagger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('RMC Digital Platform API')
      .setDescription('Rwanda Muslim Community REST API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = parseInt(process.env.APP_PORT || '3000', 10);
  await app.listen(port);
}

bootstrap();
