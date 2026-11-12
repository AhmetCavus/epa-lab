import { testEnvironment, standardTestEnvironment } from '../../test/fixtures';
import { readConfiguration } from './configuration';
import { clientProfile } from './client-profile';
import { AuthorizationError } from '../common/errors/authorization-error';
import { isSafeConfiguredUrl, validateEnvironment } from './configuration.validation';

describe('environment validation', () => {
  it('keeps the standard profile unavailable for legacy-only configuration', () => {
    const config = readConfiguration(testEnvironment);
    expect(config.standardProfile).toBeUndefined();
    expect(clientProfile(config, 'epa-par').clientId).toBe(testEnvironment.OIDC_CLIENT_ID);
    expect(() => clientProfile(config, 'playground-standard')).toThrow(AuthorizationError);
    expect(
      readConfiguration({ ...testEnvironment, PLAYGROUND_OIDC_CLIENT_SECRET: '' }).standardProfile,
    ).toBeUndefined();
  });

  it('enables only the fixed server-side standard profile with an independent secret/callback', () => {
    const config = readConfiguration(standardTestEnvironment);
    expect(clientProfile(config, 'playground-standard')).toMatchObject({
      id: 'playground-standard',
      issuer: testEnvironment.OIDC_ISSUER,
      clientId: 'playground-oidc',
      defaultRedirectUri: standardTestEnvironment.PLAYGROUND_OIDC_REDIRECT_URI,
      scope: 'openid demo.fhir.read',
    });
    expect(Object.isFrozen(config.standardProfile)).toBe(true);
    expect(config.clientSecret).toBe(testEnvironment.OIDC_CLIENT_SECRET);
  });

  it.each([
    ['PLAYGROUND_OIDC_ENABLED', 'yes'],
    ['PLAYGROUND_OIDC_CLIENT_ID', undefined],
    ['PLAYGROUND_OIDC_CLIENT_ID', 'caller-selected-client'],
    ['PLAYGROUND_OIDC_CLIENT_SECRET', undefined],
    ['PLAYGROUND_OIDC_CLIENT_SECRET', 'short-sensitive-value'],
    ['PLAYGROUND_OIDC_REDIRECT_URI', undefined],
    ['PLAYGROUND_OIDC_REDIRECT_URI', 'http://localhost:3000/callback'],
    ['PLAYGROUND_OIDC_REDIRECT_URI', 'http://localhost:3000/api/oauth/callback?override=1'],
    ['PLAYGROUND_OIDC_REDIRECT_URI', 'http://localhost:3000/api/oauth/*'],
    ['PLAYGROUND_OIDC_REDIRECT_URI', 'http://localhost:9999/api/oauth/callback'],
    ['PLAYGROUND_APP_ORIGIN', undefined],
    ['PLAYGROUND_APP_ORIGIN', 'sensitive-invalid-origin'],
    ['PLAYGROUND_APP_ORIGIN', 'http://localhost:3000/extra'],
    ['PLAYGROUND_APP_ORIGIN', 'http://localhost:3000/'],
  ])(
    'rejects incomplete or unsafe enabled settings for %s with field-only errors',
    (key, value) => {
      let message = '';
      try {
        readConfiguration({ ...standardTestEnvironment, [key]: value });
      } catch (error) {
        message = String(error);
      }
      expect(message).toContain(`Invalid environment configuration: ${key}`);
      if (value) {
        expect(message.includes(value)).toBe(false);
      }
    },
  );

  it('rejects reused credentials, client identity and callbacks across enabled profiles', () => {
    expect(() =>
      readConfiguration({ ...standardTestEnvironment, OIDC_CLIENT_ID: 'playground-oidc' }),
    ).toThrow('PLAYGROUND_OIDC_CLIENT_ID');
    expect(() =>
      readConfiguration({
        ...standardTestEnvironment,
        OIDC_CLIENT_SECRET: standardTestEnvironment.PLAYGROUND_OIDC_CLIENT_SECRET,
      }),
    ).toThrow('PLAYGROUND_OIDC_CLIENT_SECRET');
    expect(() =>
      readConfiguration({
        ...standardTestEnvironment,
        OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify([
          testEnvironment.OIDC_DEFAULT_REDIRECT_URI,
          standardTestEnvironment.PLAYGROUND_OIDC_REDIRECT_URI,
        ]),
      }),
    ).toThrow('PLAYGROUND_OIDC_REDIRECT_URI');
  });

  it('retains the explicit private-HTTP opt-in for standard application URLs', () => {
    const fields = {
      ...standardTestEnvironment,
      PLAYGROUND_APP_ORIGIN: 'http://192.168.178.131:3000',
      PLAYGROUND_OIDC_REDIRECT_URI: 'http://192.168.178.131:3000/api/oauth/callback',
    };
    expect(() => readConfiguration(fields)).toThrow('PLAYGROUND_OIDC_REDIRECT_URI');
    expect(
      readConfiguration({ ...fields, OIDC_ALLOW_PRIVATE_NETWORK_HTTP: 'true' }).standardProfile,
    ).toBeDefined();
  });
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
