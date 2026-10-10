import { createAuthorizationTransaction, deriveCodeChallenge } from './authorization-transaction';

describe('authorization transactions', () => {
  it('matches the RFC 7636 appendix B S256 example', () => {
    expect(deriveCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('creates independent random state, nonce and valid PKCE secrets', () => {
    const first = createAuthorizationTransaction();
    const second = createAuthorizationTransaction();

    for (const transaction of [first, second]) {
      expect(transaction.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(transaction.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(transaction.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(transaction.codeChallenge).toBe(deriveCodeChallenge(transaction.codeVerifier));
      expect(new Set([transaction.state, transaction.nonce, transaction.codeVerifier]).size).toBe(
        3,
      );
    }

    expect(first.state).not.toBe(second.state);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
  });
});
