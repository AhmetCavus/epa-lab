import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requestIdPattern } from '../../authorization/authorization-request';

export function configureRequestLogging(app: INestApplication): void {
  const logger = new Logger('Http');

  app.use((request: Request, response: Response, next: NextFunction) => {
    const suppliedRequestId = request.headers['x-request-id'];
    const requestId =
      typeof suppliedRequestId === 'string' && requestIdPattern.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    const startedAt = performance.now();
    const operation =
      request.path === '/epa/authz/v1/send_authorization_request_fdv'
        ? 'sendAuthorizationRequestFdV'
        : 'health_or_http';
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.on('finish', () => {
      logger.log({
        event: 'http_complete',
        operation,
        requestId,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });
    next();
  });
}
