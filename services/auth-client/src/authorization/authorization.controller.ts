import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizationError } from '../common/errors/authorization-error';
import { validateAuthorizationHeaders } from './authorization-request';
import { AuthorizationService } from './authorization.service';

@Controller('epa/authz/v1')
export class AuthorizationController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get('send_authorization_request_fdv')
  async sendAuthorizationRequestFdV(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    if (Object.keys(request.query).length > 0) {
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'This operation accepts header parameters only.',
      );
    }

    const requestId = String(response.getHeader('X-Request-ID'));
    const authorizationRequest = validateAuthorizationHeaders(request.headers, requestId);
    const location = await this.authorization.initiate(authorizationRequest);
    response.status(302).setHeader('Location', location).end();
  }
}
