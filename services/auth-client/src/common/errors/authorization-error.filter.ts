import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AuthorizationError } from './authorization-error';
import { OidcUpstreamError } from '../../oidc/oidc-client.service';

@Catch()
export class AuthorizationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthorizationErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let mappedError = new AuthorizationError(
      { status: 500, code: 'internalError' },
      'Authorization provider unavailable or invalid response.',
    );

    if (exception instanceof AuthorizationError) {
      mappedError = exception;
    } else if (exception instanceof HttpException && exception.getStatus() === 404) {
      mappedError = new AuthorizationError(
        { status: 404, code: 'noResource' },
        'Resource not found.',
      );
    }

    this.logger.warn({
      event: 'request_failure',
      requestId: response.getHeader('X-Request-ID'),
      status: mappedError.getStatus(),
      reason: exception instanceof OidcUpstreamError ? exception.reason : 'request_rejected',
    });
    response.status(mappedError.getStatus()).json(mappedError.getResponse());
  }
}
