import { createHash, randomBytes } from 'node:crypto';

export interface AuthorizationTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
}

export function deriveCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

export function createAuthorizationTransaction(): AuthorizationTransaction {
  const codeVerifier = randomBytes(32).toString('base64url');

  return {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
    codeVerifier,
    codeChallenge: deriveCodeChallenge(codeVerifier),
  };
}
