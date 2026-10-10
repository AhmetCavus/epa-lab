import { testEnvironment } from '../../test/fixtures';
import { validateEnvironment } from './configuration.validation';

describe('environment validation', () => {
  it('parses required values and finite defaults', () => {
    expect(validateEnvironment(testEnvironment)).toMatchObject({
      PORT: 3000,
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
});
