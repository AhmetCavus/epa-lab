import { testEnvironment } from '../../test/fixtures';
import { isSafeConfiguredUrl, validateEnvironment } from './configuration.validation';

describe('environment validation', () => {
  it('parses required values and finite defaults', () => {
    expect(validateEnvironment(testEnvironment)).toMatchObject({
      PORT: 3000,
      HOST: '127.0.0.1',
      OIDC_ALLOW_PRIVATE_NETWORK_HTTP: false,
      OIDC_HTTP_TIMEOUT_MS: 5000,
      OIDC_ALLOWED_REDIRECT_URIS: [
        'http://localhost:3000/callback',
        'http://localhost:3000/registered',
      ],
    });
  });

  it.each([
    ['OIDC_CLIENT_SECRET', undefined],
    ['OIDC_CLIENT_SECRET', 'short'],
    ['OIDC_ISSUER', 'not-a-url'],
    ['OIDC_ISSUER', 'http://external.example/realms/demo'],
    ['OIDC_ISSUER', 'http://user:password@localhost:8080/realms/demo'],
    ['OIDC_ISSUER', 'http://localhost:8080/realms/demo/'],
    ['OIDC_ISSUER', 'http://localhost:8080/realms/demo?query=1'],
    ['OIDC_DEFAULT_REDIRECT_URI', 'http://localhost:3000/unregistered'],
    ['OIDC_ALLOWED_REDIRECT_URIS', 'not-json'],
    ['OIDC_ALLOWED_REDIRECT_URIS', '["http://localhost:3000/*"]'],
    ['OIDC_ALLOWED_REDIRECT_URIS', '["http://localhost:3000/callback#fragment"]'],
    ['PORT', '0'],
    ['HOST', 'http://localhost:3000'],
    ['HOST', '192.168.178.999'],
    ['OIDC_ALLOW_PRIVATE_NETWORK_HTTP', 'yes'],
    ['OIDC_HTTP_TIMEOUT_MS', 'Infinity'],
  ])('fails fast for invalid %s without disclosing values', (field, value) => {
    expect(() => validateEnvironment({ ...testEnvironment, [field]: value })).toThrow(
      `Invalid environment configuration: ${field}`,
    );
  });

  it('does not disclose secrets through validation exceptions', () => {
    const secret = 'sensitive';
    try {
      validateEnvironment({ ...testEnvironment, OIDC_CLIENT_SECRET: secret });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it('allows a LAN issuer only with an explicit development opt-in', () => {
    const issuer = 'http://192.168.178.131:5555/realms/epa-demo';
    expect(() => validateEnvironment({ ...testEnvironment, OIDC_ISSUER: issuer })).toThrow(
      'Invalid environment configuration: OIDC_ISSUER',
    );
    expect(
      validateEnvironment({
        ...testEnvironment,
        HOST: '0.0.0.0',
        OIDC_ISSUER: issuer,
        OIDC_ALLOW_PRIVATE_NETWORK_HTTP: 'true',
      }),
    ).toMatchObject({
      HOST: '0.0.0.0',
      OIDC_ISSUER: issuer,
      OIDC_ALLOW_PRIVATE_NETWORK_HTTP: true,
    });
  });

  it.each(['10.0.0.5', '172.16.0.5', '172.31.255.5', '192.168.178.131'])(
    'accepts private HTTP address %s only when enabled',
    (address) => {
      const uri = `http://${address}:5555/realms/epa-demo`;
      expect(isSafeConfiguredUrl(uri)).toBe(false);
      expect(isSafeConfiguredUrl(uri, true)).toBe(true);
    },
  );

  it.each(['172.15.0.5', '172.32.0.5', '169.254.169.254', '8.8.8.8', 'external.example'])(
    'rejects non-private HTTP host %s even with the development opt-in',
    (address) => {
      expect(isSafeConfiguredUrl(`http://${address}/issuer`, true)).toBe(false);
    },
  );

  it('applies the LAN opt-in to redirect URIs as well as the issuer', () => {
    const uri = 'http://192.168.178.131:3000/callback';
    const environment = {
      ...testEnvironment,
      OIDC_DEFAULT_REDIRECT_URI: uri,
      OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify([uri]),
    };
    expect(() => validateEnvironment(environment)).toThrow('OIDC_DEFAULT_REDIRECT_URI');
    expect(
      validateEnvironment({ ...environment, OIDC_ALLOW_PRIVATE_NETWORK_HTTP: 'true' }),
    ).toMatchObject({ OIDC_DEFAULT_REDIRECT_URI: uri });
  });
});
