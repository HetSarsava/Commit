import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.getStatus(exception);
    const message = this.getMessage(exception, status);

    response.status(status).json({
      error: {
        code: this.getCode(exception, status),
        message,
      },
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return HttpStatus.CONFLICT;
      if (exception.code === 'P2025') return HttpStatus.NOT_FOUND;
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getCode(exception: unknown, status: number): string {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return exception.code;
    }
    if (exception instanceof HttpException) {
      return exception.name.replace(/Exception$/, '').toUpperCase();
    }
    return status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'API_ERROR';
  }

  private getMessage(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') return payload;
      if (typeof payload === 'object' && payload && 'message' in payload) {
        const message = (payload as { message: unknown }).message;
        return Array.isArray(message) ? message.join(', ') : String(message);
      }
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return 'A record with these values already exists';
      if (exception.code === 'P2025') return 'The requested record was not found';
      return 'The database rejected this request';
    }
    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Something went wrong. Please try again.'
      : 'The request could not be completed';
  }
}
