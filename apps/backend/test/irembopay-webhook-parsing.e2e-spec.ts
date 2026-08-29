import { INestApplication, Controller, Post, Req, HttpCode } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json, raw } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import * as request from 'supertest';

/**
 * The IremboPay callback must answer 200 to every body, forgery or garbage
 * included. `express.json()` throws on a malformed body *inside middleware* —
 * before any controller runs — and the exception filter turns that into a 400,
 * which tells a prober the endpoint is real and only their body was wrong.
 *
 * The service specs cover how a bad body is classified; this proves it reaches
 * the handler at all, with the right status and the raw bytes intact.
 */
@Controller('api/v1/webhooks')
class ProbeController {
  @Post('irembopay')
  @HttpCode(200)
  irembopay(@Req() req: IncomingMessage & { rawBody?: Buffer; body?: unknown }) {
    return {
      rawLen: req.rawBody?.length ?? -1,
      bodyType:
        req.body === undefined ? 'undefined' : Array.isArray(req.body) ? 'array' : typeof req.body,
    };
  }

  @Post('other')
  @HttpCode(200)
  other() {
    return { ok: true };
  }
}

describe('IremboPay webhook body parsing (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = mod.createNestApplication();

    // Must mirror apps/backend/src/main.ts.
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

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const hit = (path: string, body: string) =>
    request(app.getHttpServer()).post(path).set('Content-Type', 'application/json').send(body);

  it.each([
    ['unparseable text', 'not json at all'],
    ['truncated object', '{"a":'],
    ['bare brace', '{'],
  ])('answers 200 to %s, with body undefined and the raw bytes kept', async (_l, body) => {
    const res = await hit('/api/v1/webhooks/irembopay', body);

    expect(res.status).toBe(200);
    expect(res.body.bodyType).toBe('undefined');
    expect(res.body.rawLen).toBe(Buffer.byteLength(body));
  });

  it('answers 200 to an empty body', async () => {
    const res = await hit('/api/v1/webhooks/irembopay', '');
    expect(res.status).toBe(200);
    expect(res.body.bodyType).toBe('object');
  });

  it('parses valid JSON and still exposes the exact wire bytes for the HMAC', async () => {
    const body = '{"invoiceNumber":"886000000001","paymentStatus":"PAID"}';
    const res = await hit('/api/v1/webhooks/irembopay', body);

    expect(res.status).toBe(200);
    expect(res.body.bodyType).toBe('object');
    expect(res.body.rawLen).toBe(Buffer.byteLength(body));
  });

  it('leaves every other route on the strict parser — a bad body there is a 400', async () => {
    const res = await hit('/api/v1/webhooks/other', 'not json');
    expect(res.status).toBe(400);
  });
});
