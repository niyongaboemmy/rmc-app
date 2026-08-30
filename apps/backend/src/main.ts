import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
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
  /**
   * IremboPay signs its webhooks over the RAW request bytes. Re-serialising the
   * parsed object cannot reproduce them — key order, whitespace and number
   * formatting all differ from the wire — so the buffer is captured here, before
   * the parser discards it. Scoped to the webhook path: retaining a 2 MB buffer
   * on every request would be a memory cost for nothing.
   */
  /*
   * The IremboPay webhook, before the strict JSON parser and separate from it.
   *
   * Its contract is "answer 200 to everything, even a forgery". The global
   * `json()` below throws on a malformed body inside Express middleware — before
   * any controller runs — and the exception filter turns that into a 400, which
   * tells a prober the endpoint is real and only their body was wrong.
   *
   * `raw()` never rejects: it hands the controller the exact bytes on
   * `req.rawBody` (which the HMAC is computed over) and a parsed `req.body`, or
   * leaves `req.body` undefined when the bytes are not JSON — the handler then
   * classifies it as `malformed` and still returns 200.
   */
  app.use(
    '/api/v1/webhooks/irembopay',
    raw({ type: () => true, limit: '2mb' }),
    (
      req: IncomingMessage & { rawBody?: Buffer; body?: unknown },
      _res: ServerResponse,
      next: (err?: unknown) => void,
    ) => {
      const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      req.rawBody = buf;
      try {
        req.body = buf.length ? JSON.parse(buf.toString('utf8')) : {};
      } catch {
        req.body = undefined;
      }
      next();
    },
  );

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
