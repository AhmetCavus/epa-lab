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
      if (mode === '401' || mode === '403' || mode === '500') {
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
      response.end(
        JSON.stringify(
          mode === 'unsafe-resource'
            ? { ...fixture, subject: { reference: 'fictional-sensitive-identity' } }
            : fixture,
        ),
      );
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

  function read() {
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
});
