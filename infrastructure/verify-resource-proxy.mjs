import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { availablePort } from './keycloak/verify-public-realm.mjs';

const directory = await mkdtemp(join(tmpdir(), 'epa-resource-proxy-'));
const name = `epa-resource-proxy-${randomBytes(5).toString('hex')}`;
const received = [];
const upstream = createServer((incoming, response) => {
  received.push({ url: incoming.url, method: incoming.method, headers: incoming.headers });
  response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
});
let container;
function docker(...args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(`Isolated proxy Docker operation failed: ${args[0]}`);
  }
}
try {
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = upstream.address().port;
  const port = await availablePort();
  const configuration = (
    await readFile(
      new URL('../apps/playground/nginx/public-runtime.conf.template', import.meta.url),
      'utf8',
    )
  )
    .replaceAll('${PLAYGROUND_TRAEFIK_ADDRESS}', '127.0.0.1')
    .replaceAll('${PLAYGROUND_BFF_UPSTREAM}', `127.0.0.1:${upstreamPort}`)
    .replaceAll('${PLAYGROUND_KEYCLOAK_UPSTREAM}', `127.0.0.1:${upstreamPort}`)
    .replace('listen 80;', `listen 127.0.0.1:${port};`);
  await writeFile(join(directory, 'nginx.conf'), configuration, { mode: 0o600 });
  const image = docker(
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    'epa-lab/playground:public-candidate-20261114',
  );
  const boundary = new URL('../apps/playground/nginx/boundary.conf', import.meta.url).pathname;
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
    '--entrypoint',
    'nginx',
    '--mount',
    `type=bind,source=${join(directory, 'nginx.conf')},target=/etc/nginx/conf.d/default.conf,readonly`,
    '--mount',
    `type=bind,source=${boundary},target=/opt/playground-nginx/boundary.conf,readonly`,
    image,
    '-g',
    'daemon off;',
  );
  const headers = {
    Host: 'auth-playground.yappai.de',
    'X-Forwarded-Host': 'auth-playground.yappai.de',
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-Port': '443',
    'CF-Connecting-IP': '192.0.2.25',
    'CF-Visitor': '{"scheme":"https"}',
  };
  function call(path, options = {}) {
    return new Promise((resolve, reject) => {
      const outgoing = request(
        `http://127.0.0.1:${port}${path}`,
        {
          method: options.method ?? 'GET',
          headers: options.headers ?? headers,
          localAddress: options.localAddress ?? '127.0.0.1',
        },
        (response) => {
          response.resume();
          resolve({ status: response.statusCode, headers: response.headers });
        },
      );
      outgoing.on('error', reject);
      outgoing.end();
    });
  }
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await call('/health')).status === 200) break;
    } catch {}
    await setTimeout(100);
  }
  const selected = '/api/oauth/resource?resourceType=Basic&resourceId=playground-demo';
  assert.equal((await call(selected)).status, 200);
  assert.equal(received[0].url, selected);
  assert.equal(received[0].method, 'GET');
  assert.equal(received[0].headers['x-forwarded-for'], '192.0.2.25');
  assert.equal(received[0].headers.host, 'auth-playground.yappai.de');
  const before = received.length;
  assert.equal((await call(selected, { headers: { Host: headers.Host } })).status, 403);
  assert.equal(
    (await call(selected, { headers: { ...headers, 'X-Forwarded-Proto': 'http' } })).status,
    403,
  );
  assert.equal((await call(selected, { localAddress: '127.0.0.2' })).status, 403);
  for (const method of ['HEAD', 'POST', 'PUT', 'DELETE'])
    assert.equal((await call(selected, { method })).status, 405);
  for (const path of [
    '/api/oauth/resource-catalog',
    '/api/oauth/resource/Patient',
    '/fhir/Basic/playground-demo',
    '/api/oauth/resource%2fextra',
  ])
    assert.equal((await call(path)).status, 404);
  assert.equal(received.length, before);
  const statuses = [];
  for (let index = 0; index < 12; index += 1) statuses.push((await call(selected)).status);
  assert.ok(statuses.includes(429));
  assert.equal((await call('/api/oauth/logout', { method: 'POST' })).status, 200);
  await setTimeout(2200);
  assert.equal((await call(selected)).status, 200);
  const logs = docker('logs', container);
  assert.ok(!logs.includes('resourceType=') && !logs.includes('resourceId='));
  const result = {
    verified: true,
    existingRouteQueryForwarding: true,
    trustMethodAndPathDenials: true,
    noCatalogRoute: true,
    actualNginx429: true,
    explicitRetryRecovery: true,
    independentLogout: true,
    safeOperationOnlyLogs: true,
    liveRoutingUnchanged: true,
  };
  await writeFile(join(directory, 'results.json'), JSON.stringify(result, null, 2), {
    mode: 0o600,
  });
  console.info(JSON.stringify({ ...result, directory }));
} finally {
  if (container) {
    docker('stop', '--time', '3', container);
    docker('rm', container);
  }
  upstream.closeAllConnections();
  await new Promise((resolve) => upstream.close(resolve));
}
