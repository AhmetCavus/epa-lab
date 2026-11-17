import { createServer } from 'node:http';
import type { Server, IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { profileTestConfiguration } from '../../../test/fixtures';
import { readStandardResource } from './standard-resource';

const fixture = {
  resourceType: 'Basic',
  id: 'playground-demo',
  meta: { versionId: '1', source: '#fictional-server-metadata' },
  code: {
    coding: [
      {
        system: 'https://example.invalid/playground/demo',
        code: 'oauth-learning-demo',
        display: 'Fictional protocol learning resource',
      },
    ],
    text: 'Synthetic non-clinical OAuth demonstration; no patient data',
  },
};

describe('the single bounded FHIR read', () => {
  let server: Server;
  let mode: string;
  let headers: IncomingHttpHeaders;
  let requests: number;
  let redirected: number;
  let other: Server;
  let resourceUrl: string;
  const received = jest.fn();
  const timers: ReturnType<typeof setTimeout>[] = [];

  beforeAll(async () => {
    other = createServer((_request, response) => {
      redirected += 1;
      response.end('{}');
    });
    await new Promise<void>((resolve) => other.listen(0, '127.0.0.1', resolve));
    server = createServer((request, response) => {
      requests += 1;
      headers = request.headers;
      expect(request.method === 'GET' && request.url === '/fhir/Basic/playground-demo').toBe(true);
      if (mode === 'redirect') {
        response
          .writeHead(302, {
            location: `http://127.0.0.1:${(other.address() as AddressInfo).port}/untrusted`,
          })
          .end();
        return;
      }
      if (mode === 'slow-headers') {
        timers.push(setTimeout(() => response.end('{}'), 1000));
        return;
      }
      if (['401', '403', '404', '500'].includes(mode)) {
        response.writeHead(Number(mode), {
          'x-playground-decision': 'denied',
          'x-playground-reason': mode === '403' ? 'insufficient-permission' : 'invalid-token',
        });
        response.end('fictional-sensitive-denial-body');
        return;
      }
      response.setHeader(
        'content-type',
        mode === 'content-type' ? 'text/plain' : 'application/fhir+json',
      );
      response.setHeader('x-playground-decision', 'allowed');
      response.setHeader('x-playground-reason', 'demo-read-allowed');
      if (mode === 'slow-body') {
        response.write('{');
        timers.push(setTimeout(() => response.end('}'), 1000));
        return;
      }
      if (mode === 'oversized' || mode === 'compressed-oversized') {
        const body = JSON.stringify(fixture) + ' '.repeat(70000);
        if (mode === 'compressed-oversized') {
          response.setHeader('content-encoding', 'gzip');
          response.end(gzipSync(body));
        } else {
          response.write(body.slice(0, 40000));
          response.end(body.slice(40000));
        }
        return;
      }
      if (mode === 'json') {
        response.end('fictional-sensitive-invalid-json');
        return;
      }
      const payload = structuredClone(fixture);
      let body: unknown = payload;
      if (mode === 'unsafe-resource')
        body = { ...payload, subject: { reference: 'fictional-sensitive-identity' } };
      if (mode === 'wrong-id') body = { ...payload, id: 'another-id' };
      if (mode === 'wrong-type') body = { ...payload, resourceType: 'Patient' };
      if (mode === 'unsafe-code') body = { ...payload, code: { text: 'fictional-sensitive-code' } };
      if (mode === 'unsafe-version')
        body = { ...payload, meta: { versionId: '<script>fictional-sensitive</script>' } };
      if (mode === 'narrative')
        body = { ...payload, text: { status: 'generated', div: 'fictional-sensitive-narrative' } };
      if (mode === 'extension')
        body = { ...payload, extension: [{ url: 'fictional-sensitive-url' }] };
      response.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    resourceUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/fhir/Basic/playground-demo`;
  });

  beforeEach(() => {
    mode = 'ok';
    requests = 0;
    redirected = 0;
    received.mockReset();
  });

  afterEach(() => {
    for (const timer of timers.splice(0)) {
      clearTimeout(timer);
    }
  });

  afterAll(async () => {
    server.closeAllConnections();
    other.closeAllConnections();
    await Promise.all(
      [server, other].map(
        (instance) => new Promise<void>((resolve) => instance.close(() => resolve())),
      ),
    );
  });

  function read(selected = false) {
    const profile = profileTestConfiguration.standardProfile;
    if (!profile) {
      throw new Error('Expected standard test configuration');
    }
    return readStandardResource(
      {
        ...profileTestConfiguration,
        httpTimeoutMs: mode.startsWith('slow') ? 100 : 1000,
        standardProfile: { ...profile, resourceUrl },
      },
      'fictional-server-access-token',
      received,
      selected,
    );
  }

  it('uses only the fixed GET and server-held bearer, and projects only three literal fields', async () => {
    const result = await read();
    expect(result).toEqual({
      kind: 'allowed',
      resource: { resourceType: 'Basic', id: 'playground-demo', code: 'oauth-learning-demo' },
      report: {
        available: true,
        reportedBy: 'res-server',
        decision: 'allowed',
        reason: 'demo-read-allowed',
      },
    });
    expect(headers.authorization === 'Bearer fictional-server-access-token').toBe(true);
    expect(headers.cookie).toBeUndefined();
    expect(headers.accept).toBe('application/fhir+json');
    expect(JSON.stringify(result).includes('fictional-server-metadata')).toBe(false);
  });

  it.each(['401', '403'])('returns only a safe denial for HTTP %s', async (status) => {
    mode = status;
    const result = await read();
    expect(result.kind).toBe('denied');
    expect(JSON.stringify(result).includes('fictional-sensitive')).toBe(false);
  });

  it.each([
    ['500', 'unexpected-status'],
    ['content-type', 'invalid-response'],
    ['json', 'invalid-response'],
    ['unsafe-resource', 'invalid-response'],
    ['oversized', 'response-too-large'],
    ['compressed-oversized', 'response-too-large'],
    ['slow-headers', 'timeout'],
    ['slow-body', 'timeout'],
    ['redirect', 'network-error'],
  ])('bounds and sanitizes %s failures', async (failure, reason) => {
    mode = failure;
    const result = await read();
    expect(result).toEqual({ kind: 'failed', reason });
    expect(redirected).toBe(0);
    expect(JSON.stringify(result).includes('fictional-sensitive')).toBe(false);
  });

  it('refuses a changed upstream path before sending credentials', async () => {
    resourceUrl = resourceUrl.replace('/Basic/playground-demo', '/Patient');
    expect(await read()).toEqual({ kind: 'failed', reason: 'invalid-response' });
    expect(requests).toBe(0);
    resourceUrl = resourceUrl.replace('/Patient', '/Basic/playground-demo');
  });
  it('selected output derives actual FHIR code and safe metadata while omitting source', async () => {
    const result = await read(true);
    expect(result).toMatchObject({
      kind: 'allowed',
      fhir: {
        resourceType: 'Basic',
        id: 'playground-demo',
        code: fixture.code,
        meta: { versionId: '1' },
      },
    });
    expect(result.kind === 'allowed' && result.fhir?.code).toEqual(fixture.code);
    expect(JSON.stringify(result)).not.toContain('fictional-server-metadata');
  });
  it.each([
    'content-type',
    'json',
    'unsafe-resource',
    'wrong-id',
    'wrong-type',
    'unsafe-code',
    'unsafe-version',
    'narrative',
    'extension',
    'oversized',
    'compressed-oversized',
  ])('selected output rejects %s without disclosure', async (failure) => {
    mode = failure;
    const result = await read(true);
    expect(result.kind).toBe('failed');
    expect(JSON.stringify(result)).not.toContain('fictional-sensitive');
    expect(JSON.stringify(result)).not.toContain('fhir');
  });
  it('only a selected actual 404 becomes not-found; the legacy status contract is unchanged', async () => {
    mode = '404';
    expect(await read(true)).toEqual({ kind: 'not-found' });
    expect(await read()).toEqual({ kind: 'failed', reason: 'unexpected-status' });
  });
});
