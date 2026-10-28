import { BrowserLoginStore, loginLifetimeMs } from './browser-login.store';
import type { PendingLogin } from './browser-login.store';
import type { VerifiedLogin } from '../../oidc/token.service';
import { createAuthorizationTransaction } from '../../oidc/authorization-transaction';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { testMetadata, testConfiguration } from '../../../test/fixtures';

describe('bounded browser login storage', () => {
  afterEach(() => jest.restoreAllMocks());

  it('bounds pending transactions and recovers capacity after they expire', () => {
    const store = new BrowserLoginStore();
    const login: Omit<PendingLogin, 'expiresAt'> = {
      transaction: createAuthorizationTransaction(),
      browserBinding: 'fictional-browser-binding',
      metadata: testMetadata,
      redirectUri: testConfiguration.defaultRedirectUri,
    };

    for (let index = 0; index < 1000; index += 1) {
      store.save({ ...login, transaction: { ...login.transaction, state: `state-${index}` } });
    }

    expect(() => store.save(login)).toThrow(AuthorizationError);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + loginLifetimeMs + 1);
    expect(() => store.save(login)).not.toThrow();
    expect(store.consume(login.transaction.state, login.browserBinding).transaction).toEqual(
      login.transaction,
    );
  });

  it('bounds sessions and recovers capacity when their maximum lifetime ends', () => {
    const store = new BrowserLoginStore();
    const expiresAt = Date.now() + 20 * 60 * 1000;
    const login: VerifiedLogin = {
      idToken: {
        identity: { subject: 'fictional-user', issuer: testConfiguration.issuer },
        expiresAt,
      },
      tokens: {
        access_token: 'fictional-access-token',
        id_token: 'fictional-id-token',
        token_type: 'Bearer',
        expires_in: 1200,
      },
      expiresAt,
    };

    for (let index = 0; index < 1000; index += 1) {
      store.createSession(login, undefined);
    }

    expect(() => store.createSession(login, undefined)).toThrow(AuthorizationError);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 15 * 60 * 1000 + 1);
    expect(() => store.createSession(login, undefined)).not.toThrow();
  });
});
