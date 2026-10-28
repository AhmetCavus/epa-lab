import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationError } from '../common/errors/authorization-error';

export const userAgentPattern = /^[a-zA-Z0-9-]{1,20}\/[a-zA-Z0-9.-]{1,15}$/;
export const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthorizationRequest {
  issuer: string;
  redirectUri: string | undefined;
  requestId: string;
}

export function validateAuthorizationHeaders(
  headers: IncomingHttpHeaders,
  requestId: string,
): AuthorizationRequest {
  const issuer = headers['x-idp-iss'];
  const userAgent = headers['x-useragent'];
  const redirectUri = headers['x-redirecturi'];
  const suppliedRequestId = headers['x-request-id'];
  const representative = headers['x-authorize-representative'];
  const egk = headers['x-authorize-egk'];

  const hasMalformedHeader =
    typeof issuer !== 'string' ||
    issuer.length === 0 ||
    issuer.length > 2048 ||
    typeof userAgent !== 'string' ||
    !userAgentPattern.test(userAgent) ||
    (redirectUri !== undefined && (typeof redirectUri !== 'string' || redirectUri.length === 0)) ||
    (suppliedRequestId !== undefined &&
      (typeof suppliedRequestId !== 'string' || !requestIdPattern.test(suppliedRequestId))) ||
    (representative !== undefined && representative !== 'true') ||
    (egk !== undefined && egk !== 'true') ||
    (representative === 'true' && egk === 'true');

  if (hasMalformedHeader) {
    throw new AuthorizationError(
      { status: 400, code: 'malformedRequest' },
      'Headers do not match the sendAuthorizationRequestFdV schema.',
    );
  }

  if (representative === 'true' || egk === 'true') {
    throw new AuthorizationError(
      { status: 403, code: 'invalAuth' },
      'Representative and eGK guest authentication are outside this milestone.',
    );
  }

  return { issuer, redirectUri, requestId };
}
