import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../types/error-codes.enum';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        code = (res['code'] as string) || this.statusToCode(status);
        message = (res['message'] as string) || exception.message;
        if (Array.isArray(res['message'])) {
          details = res['message'] as unknown[];
          message = 'Validation failed';
          code = ErrorCode.VALIDATION_ERROR;
        }
        if (Array.isArray(res['details'])) {
          details = res['details'] as unknown[];
        }
      } else {
        message = exceptionResponse as string;
        code = this.statusToCode(status);
      }
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * The status → `error.code` map the whole API is labelled from.
   *
   * A status missing from here falls through to INTERNAL_ERROR, which is not a harmless
   * default: it tells a client "the server broke" for something the server handled
   * deliberately. 409 and 429 were both missing, so every duplicate-submission conflict and
   * every rate-limit in the platform arrived carrying the same code as a crash — correct
   * HTTP status, misleading body. A frontend switching on `error.code` could not tell them
   * apart, and the honest "you already submitted this" / "you're posting too quickly"
   * messages were unreachable without string-matching the prose.
   *
   * 422 maps to VALIDATION_ERROR alongside 400: both mean "your payload is wrong", and a
   * client has no use for the distinction.
   */
  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCode.VALIDATION_ERROR,
      // Kept as the auth-specific code rather than UNAUTHORIZED: existing clients match on
      // it for the sign-in flow, and changing it would be a breaking change for no gain.
      401: ErrorCode.AUTH_INVALID_CREDENTIALS,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      409: ErrorCode.CONFLICT,
      422: ErrorCode.VALIDATION_ERROR,
      429: ErrorCode.RATE_LIMITED,
      500: ErrorCode.INTERNAL_ERROR,
    };
    return map[status] || ErrorCode.INTERNAL_ERROR;
  }
}
