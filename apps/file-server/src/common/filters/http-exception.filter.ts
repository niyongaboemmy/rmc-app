import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp.code as string) || this.statusToCode(status);
        message = (resp.message as string) || exception.message;
        if (Array.isArray(resp.message)) {
          details = resp.message as unknown[];
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
        if (resp.details) details = resp.details as unknown[];
      } else {
        message = String(exceptionResponse);
        code = this.statusToCode(status);
      }

      // Log non-5xx guard/validation rejections at debug level so they're
      // visible without polluting the error log.
      if (status < 500) {
        this.logger.debug(
          `[${status}] ${request.method} ${request.url} — ${message}`,
        );
      }
    } else if (exception instanceof Error) {
      // Client-disconnect errors (ECONNRESET, EPIPE, ECONNABORTED) are not
      // application errors — the remote peer closed the connection. Log at
      // warn level and skip trying to write to a dead socket.
      const msg = exception.message ?? '';
      if (
        msg.includes('ECONNRESET') ||
        msg.includes('EPIPE') ||
        msg.includes('ECONNABORTED') ||
        msg.includes('ENOTCONN')
      ) {
        this.logger.warn(
          `Client disconnected on ${request.method} ${request.url} — ${msg}`,
        );
        return; // response socket is gone; nothing to send
      }

      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception.stack,
      );
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      timestamp: new Date().toISOString(),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'FILE_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'INTERNAL_ERROR';
  }
}
