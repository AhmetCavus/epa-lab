import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseEnv } from 'node:util';
import { privateUrl, standardDefinition, standardSettings } from './standard-client.mjs';

test('fresh registration keeps credentials server-side and grants separate from ePA PAR', async () => {
  const settings = standardSettings({
    KEYCLOAK_ADMIN_USERNAME: 'admin',
    KEYCLOAK_ADMIN_PASSWORD: 'test-only',
    PLAYGROUND_OIDC_CLIENT_SECRET: 'x'.repeat(43),
    PLAYGROUND_OIDC_REDIRECT_URI: 'http://localhost:3000/api/oauth/callback',
  });
  const definition = await standardDefinition(settings);
  assert.equal(definition.client.publicClient, false);
  assert.deepEqual(definition.client.defaultClientScopes, ['playground-fhir-audience']);
  assert.deepEqual(definition.client.optionalClientScopes, ['demo.fhir.read']);
  assert.equal(definition.client.attributes['pkce.code.challenge.method'], 'S256');
  const mapper = definition.scopes[0].protocolMappers[0];
  assert.equal(mapper.config['included.custom.audience'], 'playground-fhir');
  assert.equal(mapper.config['id.token.claim'], 'false');
});

test('private setup rejects public URLs, URL credentials and wildcard callbacks', () => {
  for (const value of [
    'https://auth-playground.yappai.de',
    'http://169.254.169.254',
    'http://user:password@localhost',
    'http://localhost/path?query=value',
  ]) {
    assert.throws(() => privateUrl(value));
  }
  assert.throws(() =>
    standardSettings({
      KEYCLOAK_ADMIN_USERNAME: 'admin',
      KEYCLOAK_ADMIN_PASSWORD: 'test-only',
      PLAYGROUND_OIDC_CLIENT_SECRET: 'x'.repeat(43),
      PLAYGROUND_OIDC_REDIRECT_URI: 'http://localhost:3000/*',
    }),
  );
});

test('env:init fills the separate secret/callback without rotating existing ePA values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'epa-keycloak-env-test-'));
  try {
    await mkdir(join(directory, 'infrastructure'));
    await copyFile(
      new URL('../setup-env.mjs', import.meta.url),
      join(directory, 'infrastructure/setup-env.mjs'),
    );
    await copyFile(new URL('../../.env.example', import.meta.url), join(directory, '.env.example'));
    const run = () =>
      execFileSync(process.execPath, ['infrastructure/setup-env.mjs'], {
        cwd: directory,
        stdio: 'pipe',
      });
    run();
    const fresh = parseEnv(await readFile(join(directory, '.env'), 'utf8'));
    assert.ok(fresh.PLAYGROUND_OIDC_CLIENT_SECRET.length >= 32);
    assert.ok(fresh.PLAYGROUND_OIDC_CLIENT_SECRET !== fresh.OIDC_CLIENT_SECRET);
    assert.equal((await stat(join(directory, '.env'))).mode & 0o777, 0o600);
    const existing =
      'OIDC_DEFAULT_REDIRECT_URI=http://192.168.178.131:3000/callback\nOIDC_CLIENT_SECRET=existing-epa-secret\nKEYCLOAK_ADMIN_PASSWORD=existing-admin-secret\nTEST_USER_PASSWORD=existing-user-password\nRES_SERVER_DB_PASSWORD=existing-database-password\nCUSTOM_SETTING=retained\n';
    await writeFile(join(directory, '.env'), existing);
    run();
    const migrated = await readFile(join(directory, '.env'), 'utf8');
    const values = parseEnv(migrated);
    for (const [name, value] of Object.entries(parseEnv(existing))) {
      assert.ok(values[name] === value, 'An existing environment value changed');
    }
    assert.equal(
      values.PLAYGROUND_OIDC_REDIRECT_URI,
      'http://192.168.178.131:3000/api/oauth/callback',
    );
    assert.equal(values.PLAYGROUND_OIDC_CLIENT_ID, 'playground-oidc');
    assert.ok(values.PLAYGROUND_OIDC_CLIENT_SECRET.length >= 32);
    run();
    assert.ok(
      (await readFile(join(directory, '.env'), 'utf8')) === migrated,
      'Repeated setup changed the environment',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
