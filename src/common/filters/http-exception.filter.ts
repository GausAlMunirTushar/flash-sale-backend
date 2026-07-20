import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : null;

    const message =
      body && typeof body === 'object' && 'message' in body
        ? (body as { message: string | string[] }).message
        : (exception as Error)?.message || 'Internal server error';

    response.status(statusCode).json({
      statusCode,
      message,
      error: isHttpException ? exception.name : 'InternalServerError',
    });
  }
}
