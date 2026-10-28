import { createServer } from 'node:http';
import { once } from 'node:events';
import { testConfiguration } from '../../test/fixtures';
import { OidcClientService } from './oidc-client.service';

describe('OidcClientService', () => {
  const service = new OidcClientService(testConfiguration);

  afterEach(() => jest.restoreAllMocks());

  it('requires HTTP 201 and application/json for PAR', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"request_uri":"urn:example:test","expires_in":60}', {
        status: 201,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
    );
    await expect(service.requestJson('http://localhost/par', 201)).resolves.toMatchObject({
      expires_in: 60,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost/par');
    expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe('error');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([200, 302, 400, 401, 500])('rejects an unexpected HTTP %s', async (status) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status }));
    await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
      reason: 'unexpected_status',
      upstreamStatus: status,
    });
  });

  it.each(['text/html', 'application/problem+json', ''])(
    'rejects non-JSON media type %s',
    async (type) => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('{}', { status: 201, headers: { 'content-type': type } }));
      await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
        reason: 'invalid_content_type',
      });
    },
  );

  it('rejects malformed JSON', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('not-json', { status: 201, headers: { 'content-type': 'application/json' } }),
      );
    await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
      reason: 'invalid_json',
    });
  });

  it.each([
    ['invalid_request', true],
    ['invalid_scope', true],
    ['invalid_client', false],
    ['server_error', false],
    ['secret provider error message', false],
  ])('classifies a provider OAuth error %s without retaining its body', async (code, rejected) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: code, error_description: 'sensitive provider details' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
      reason: 'unexpected_status',
      isAuthorizationRejection: rejected,
      message: 'OIDC provider failure: unexpected_status',
    });
  });

  it('limits response bodies', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x'.repeat(65537), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
      reason: 'response_too_large',
    });
  });

  it('sanitizes network exceptions', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('secret upstream contents'));
    await expect(service.requestJson('http://localhost/par', 201)).rejects.toMatchObject({
      reason: 'network_error',
      message: 'OIDC provider failure: network_error',
    });
  });

  it('aborts a stalled provider response using the actual configured deadline', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(201, { 'content-type': 'application/json' });
      response.write('{');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP listener');
    }

    try {
      await expect(
        service.requestJson(`http://127.0.0.1:${address.port}/par`, 201),
      ).rejects.toMatchObject({ reason: 'timeout' });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
