import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  publicRealmDefinition,
  publicRealmSettings,
  publicRealmName,
  publicOwner,
} from './public-realm.mjs';
import { ownerAttribute } from './standard-client.mjs';
import { demoAccountSettings } from './public-demo-account.mjs';

const environment = {
  KEYCLOAK_ADMIN_URL: 'http://127.0.0.1:18990',
  KEYCLOAK_ADMIN_USERNAME: 'isolated-admin',
  KEYCLOAK_ADMIN_PASSWORD: 'isolated-admin-password',
  PLAYGROUND_OIDC_CLIENT_SECRET: 'isolated-public-client-secret-123456789',
};

test('the public realm owns only its new HTTPS standard client and scopes', async () => {
  const definition = await publicRealmDefinition(publicRealmSettings(environment));
  assert.equal(definition.realm, publicRealmName);
  assert.equal(definition.attributes.frontendUrl, 'https://auth-playground.yappai.de');
  assert.equal(definition.attributes[ownerAttribute], publicOwner);
  assert.equal(definition.sslRequired, 'all');
  assert.equal(definition.accessTokenLifespan, 300);
  assert.equal(definition.registrationAllowed, false);
  assert.equal(definition.bruteForceProtected, true);
  assert.equal(definition.users, undefined);
  assert.equal(definition.clients.length, 1);
  const [client] = definition.clients;
  assert.equal(client.clientId, 'playground-oidc');
  assert.equal(client.publicClient, false);
  assert.equal(client.standardFlowEnabled, true);
  assert.equal(client.directAccessGrantsEnabled, false);
  assert.equal(client.serviceAccountsEnabled, false);
  assert.equal(client.attributes['pkce.code.challenge.method'], 'S256');
  assert.equal(client.attributes[ownerAttribute], publicOwner);
  assert.deepEqual(client.redirectUris, ['https://auth-playground.yappai.de/api/oauth/callback']);
  assert.deepEqual(client.defaultClientScopes, ['playground-fhir-audience']);
  assert.deepEqual(client.optionalClientScopes, ['demo.fhir.read']);
  for (const scope of definition.clientScopes) {
    assert.equal(scope.attributes[ownerAttribute], publicOwner);
  }
  const mapper = definition.clientScopes[0].protocolMappers[0];
  assert.equal(mapper.config['included.custom.audience'], 'playground-fhir');
  assert.equal(mapper.config['access.token.claim'], 'true');
  assert.equal(mapper.config['id.token.claim'], 'false');
});

test('demo provisioning accepts synthetic aliases and never echoes rejected credentials', () => {
  const valid = {
    PLAYGROUND_DEMO_USERNAME: 'demo-a123',
    PLAYGROUND_DEMO_INITIAL_PASSWORD: 'temporary-test-password',
  };
  assert.equal(demoAccountSettings(valid).username, 'demo-a123');
  for (const [name, value] of [
    ['PLAYGROUND_DEMO_USERNAME', 'person@example.com'],
    ['PLAYGROUND_DEMO_INITIAL_PASSWORD', 'private-short'],
  ]) {
    assert.throws(
      () => demoAccountSettings({ ...valid, [name]: value }),
      (error) => error instanceof Error && !error.message.includes(value),
    );
  }
});

test('administrator operations stay private and public values cannot be caller-selected', () => {
  assert.throws(() =>
    publicRealmSettings({ ...environment, KEYCLOAK_ADMIN_URL: 'https://public.example' }),
  );
  for (const [key, value] of [
    ['PLAYGROUND_APP_ORIGIN', 'https://attacker.example'],
    ['PLAYGROUND_OIDC_ISSUER', 'https://auth-playground.yappai.de/realms/epa-demo'],
    ['PLAYGROUND_OIDC_REDIRECT_URI', 'https://attacker.example/callback'],
    ['PLAYGROUND_OIDC_CLIENT_SECRET', 'sensitive-short-value'],
  ]) {
    assert.throws(
      () => publicRealmSettings({ ...environment, [key]: value }),
      (error) => error instanceof Error && !error.message.includes(value),
    );
  }
});
