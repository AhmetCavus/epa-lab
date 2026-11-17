import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { availablePort } from './keycloak/verify-public-realm.mjs';

const backendRequire = createRequire(
  new URL('../services/auth-client/package.json', import.meta.url),
);
const { sign } = backendRequire('jsonwebtoken');
const { readConfiguration } = backendRequire('./dist/config/configuration.js');
const { readStandardResource } = backendRequire(
  './dist/authorization/standard-resource/standard-resource.js',
);
const directory = await mkdtemp(join(tmpdir(), 'epa-synthetic-resource-'));
const image = 'sha256:f15d09f928f2040e0c214b1aa719d4f60ec6b34c636afc90502849ce89ed3466';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const forged = generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyId = randomUUID();
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: keyId, alg: 'RS256', use: 'sig' };
const tokens = new Set();
const results = [];
let jwksCalls = 0;
const jwks = createServer((_request, response) => {
  jwksCalls += 1;
  response
    .writeHead(200, { 'content-type': 'application/json' })
    .end(JSON.stringify({ keys: [jwk] }));
});
let container;
function docker(...args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(`Isolated HAPI Docker operation failed: ${args[0]}`);
  }
}
try {
  await new Promise((resolve) => jwks.listen(0, '127.0.0.1', resolve));
  const issuer = `http://127.0.0.1:${jwks.address().port}/realms/test`;
  const token = (changes = {}, key = keys.privateKey, algorithm = 'RS256') => {
    const now = Math.floor(Date.now() / 1000);
    const value = sign(
      {
        iss: issuer,
        sub: 'fictional-resource-owner',
        aud: 'playground-fhir',
        iat: now,
        nbf: now - 1,
        exp: now + 120,
        typ: 'Bearer',
        scope: 'openid demo.fhir.read',
        ...changes,
      },
      key,
      { algorithm, keyid: keyId },
    );
    tokens.add(value);
    return value;
  };
  async function stop() {
    if (container) {
      const logs = docker('logs', container);
      assert.ok(
        ![...tokens].some((value) => logs.includes(value)),
        'HAPI logs leaked a signed token',
      );
      assert.ok(!logs.includes('fictional-resource-owner'), 'HAPI logs leaked identity');
      docker('stop', '--time', '10', container);
      docker('rm', container);
      container = undefined;
    }
  }
  for (const seed of [true, false]) {
    const port = await availablePort();
    const name = `epa-synthetic-resource-${randomBytes(5).toString('hex')}`;
    const env = {
      SERVER_ADDRESS: '127.0.0.1',
      SERVER_PORT: String(port),
      JAVA_TOOL_OPTIONS: '-Xms128m -Xmx2g',
      FHIR_OIDC_ISSUER: issuer,
      FHIR_OIDC_JWKS_URI: `${issuer}/certs`,
      PLAYGROUND_SECURITY_ALLOW_PRIVATE_HTTP: 'false',
      PLAYGROUND_DEMO_SEED: String(seed),
      SPRING_DATASOURCE_URL: `jdbc:h2:mem:synthetic_${seed};DB_CLOSE_DELAY=-1`,
      SPRING_DATASOURCE_USERNAME: 'sa',
      SPRING_DATASOURCE_PASSWORD: '',
      SPRING_DATASOURCE_DRIVER_CLASS_NAME: 'org.h2.Driver',
      HIBERNATE_DIALECT: 'ca.uhn.fhir.jpa.model.dialect.HapiFhirH2Dialect',
    };
    const envPath = join(directory, `hapi-${seed}.env`);
    await writeFile(
      envPath,
      Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      { mode: 0o600 },
    );
    const config = readConfiguration({
      HOST: '127.0.0.1',
      PORT: '3000',
      OIDC_ISSUER: issuer,
      OIDC_CLIENT_ID: 'epa-auth-server',
      OIDC_CLIENT_SECRET: 'fictional-test-client-secret-at-least-32',
      OIDC_DEFAULT_REDIRECT_URI: 'http://127.0.0.1:3000/callback',
      OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify(['http://127.0.0.1:3000/callback']),
      PLAYGROUND_OIDC_ENABLED: 'true',
      PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
      PLAYGROUND_APP_ORIGIN: 'http://127.0.0.1:3000',
      PLAYGROUND_OIDC_CLIENT_SECRET: 'fictional-test-standard-secret-at-least-32',
      PLAYGROUND_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/api/oauth/callback',
      PLAYGROUND_FHIR_RESOURCE_URL: `http://127.0.0.1:${port}/fhir/Basic/playground-demo`,
    });
    container = docker(
      'run',
      '-d',
      '--pull',
      'never',
      '--name',
      name,
      '--label',
      'traefik.enable=false',
      '--network',
      'host',
      '--memory',
      '3g',
      '--cpus',
      '2',
      '--env-file',
      envPath,
      image,
    );
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 180; attempt += 1) {
      try {
        const response = await fetch(`${base}/actuator/health/readiness`, {
          signal: AbortSignal.timeout(1000),
        });
        await response.body?.cancel();
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await setTimeout(1000);
    }
    assert.ok(ready, 'Isolated HAPI readiness deadline exceeded');
    console.info(
      JSON.stringify({ isolatedHapiReady: true, seed, storage: 'fresh in-memory H2; no volumes' }),
    );
    async function request(path, credential, expected, reason, method = 'GET') {
      const response = await fetch(`${base}${path}`, {
        method,
        redirect: 'error',
        headers: credential ? { authorization: `Bearer ${credential}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, expected, 'Unexpected HAPI security status');
      const report = {
        decision: response.headers.get('x-playground-decision'),
        reason: response.headers.get('x-playground-reason'),
      };
      if (reason) assert.equal(report.reason, reason);
      if (expected !== 200) await response.body?.cancel();
      else {
        const body = await response.json();
        assert.equal(body.id, 'playground-demo');
        assert.equal(body.resourceType, 'Basic');
      }
      results.push({ seed, method, path, status: expected, report });
    }
    const valid = token();
    if (seed) {
      await request('/fhir/Basic/playground-demo', valid, 200, 'demo-read-allowed');
      await request('/fhir/Basic/playground-demo', undefined, 401, 'missing-token');
      await request(
        '/fhir/Basic/playground-demo',
        token({ scope: 'openid' }),
        403,
        'insufficient-permission',
      );
      const variants = [
        token({ exp: Math.floor(Date.now() / 1000) - 120 }),
        token({}, forged.privateKey),
        token({ typ: 'ID' }),
        token({ iss: 'https://untrusted.example/realm' }),
        token({ aud: 'epa-auth-server' }),
        token({ nbf: Math.floor(Date.now() / 1000) + 120 }),
        token({}, keys.privateKey, 'RS512'),
      ];
      for (const invalid of variants)
        await request('/fhir/Basic/playground-demo', invalid, 401, 'invalid-token');
      for (const path of [
        '/fhir/Patient',
        '/fhir/Observation',
        '/fhir/Basic/another-id',
        '/fhir/Basic',
        '/fhir/Basic/playground-demo/_history',
        '/fhir/Basic/playground-demo?x=1',
      ])
        await request(path, valid, 403, 'operation-not-allowed');
      for (const method of ['POST', 'PUT', 'DELETE'])
        await request('/fhir/Basic/playground-demo', valid, 403, 'operation-not-allowed', method);
    } else {
      await request('/fhir/Basic/playground-demo', valid, 404);
    }
    const observed = [];
    const selected = await readStandardResource(
      config,
      valid,
      (status, report) => observed.push({ status, report }),
      true,
    );
    assert.equal(selected.kind, seed ? 'allowed' : 'not-found');
    if (seed) {
      assert.equal(selected.fhir.id, 'playground-demo');
      assert.ok(!('source' in (selected.fhir.meta ?? {})));
      assert.deepEqual(observed, [
        {
          status: 200,
          report: {
            available: true,
            reportedBy: 'res-server',
            decision: 'allowed',
            reason: 'demo-read-allowed',
          },
        },
      ]);
    } else assert.deepEqual(observed, [{ status: 404, report: { available: false } }]);
    await stop();
  }
  assert.ok(jwksCalls > 0, 'HAPI did not use the trusted JWKS');
  const result = {
    verified: true,
    image,
    productionSecurityAndDataUnchanged: true,
    realJpaAndTrustedJwks: true,
    allowedFixtureMissingWithoutDeletion: true,
    bffActualProjectionAndProvenance: true,
    secretLogScan: true,
    checks: results,
  };
  await writeFile(join(directory, 'results.json'), JSON.stringify(result, null, 2), {
    mode: 0o600,
  });
  console.info(JSON.stringify({ verified: true, checks: results.length, directory }));
} finally {
  if (container) {
    docker('stop', '--time', '10', container);
    docker('rm', container);
  }
  await new Promise((resolve) => jwks.close(resolve));
}
