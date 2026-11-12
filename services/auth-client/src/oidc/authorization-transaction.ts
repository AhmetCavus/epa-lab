import { createHash, randomBytes } from 'node:crypto';
import type {
  ClientProfile,
  ClientProfileId,
  ProfileConfiguration,
} from '../config/client-profile';
import { clientProfile } from '../config/client-profile';
import { AuthorizationError } from '../common/errors/authorization-error';

export interface AuthorizationTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface BoundAuthorizationTransaction extends AuthorizationTransaction {
  readonly profile: {
    readonly id: ClientProfileId;
    readonly issuer: string;
    readonly clientId: string;
    readonly redirectUri: string;
  };
}

export function createBoundAuthorizationTransaction(
  profile: ClientProfile,
  redirectUri = profile.defaultRedirectUri,
): BoundAuthorizationTransaction {
  if (!profile.allowedRedirectUris.includes(redirectUri)) {
    throw new AuthorizationError(
      { status: 403, code: 'invalRedir' },
      'Redirect URI is not registered.',
    );
  }
  return Object.freeze({
    ...createAuthorizationTransaction(),
    profile: Object.freeze({
      id: profile.id,
      issuer: profile.issuer,
      clientId: profile.clientId,
      redirectUri,
    }),
  });
}

export function transactionProfile(
  config: ProfileConfiguration,
  transaction: BoundAuthorizationTransaction,
  expectedProfile: ClientProfileId,
): ClientProfile {
  const selected = clientProfile(config, expectedProfile);
  const stored = transaction.profile;
  if (
    !stored ||
    stored.id !== selected.id ||
    stored.issuer !== selected.issuer ||
    stored.clientId !== selected.clientId ||
    !selected.allowedRedirectUris.includes(stored.redirectUri) ||
    deriveCodeChallenge(transaction.codeVerifier) !== transaction.codeChallenge
  ) {
    throw new AuthorizationError(
      { status: 403, code: 'invalAuth' },
      'Transaction profile mismatch.',
    );
  }
  return selected;
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
