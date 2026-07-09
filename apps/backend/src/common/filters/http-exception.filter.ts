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

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCode.VALIDATION_ERROR,
      401: ErrorCode.AUTH_INVALID_CREDENTIALS,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      500: ErrorCode.INTERNAL_ERROR,
    };
    return map[status] || ErrorCode.INTERNAL_ERROR;
  }
}
