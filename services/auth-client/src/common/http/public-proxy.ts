import { isIP } from 'node:net';
import type { Request } from 'express';
import { AuthorizationError } from '../errors/authorization-error';

export function requirePublicProxy(request: Request, peers: readonly string[]): void {
  const remote = request.socket.remoteAddress?.replace(/^::ffff:/, '');
  const client = request.get('x-forwarded-for');
  const valid =
    remote !== undefined &&
    peers.includes(remote) &&
    request.get('host') === 'auth-playground.yappai.de' &&
    request.get('x-forwarded-host') === 'auth-playground.yappai.de' &&
    request.get('x-forwarded-proto') === 'https' &&
    request.get('x-forwarded-port') === '443' &&
    request.get('forwarded') === undefined &&
    client !== undefined &&
    isIP(client) !== 0;
  if (!valid) {
    throw new AuthorizationError(
      { status: 403, code: 'invalAuth' },
      'Trusted HTTPS proxy required.',
    );
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    throw new AuthorizationError({ status: 405, code: 'malformedRequest' }, 'Method unavailable.');
  }
}
