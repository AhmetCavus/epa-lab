import type { ResourceSelection } from '../domain/synthetic-resource';
import { selectedResourceResponseSchema } from './synthetic-resource-contract';
import type { z } from 'zod';
import {
  oauthEventDocumentSchema,
  oauthResourceSchema,
  oauthSessionSchema,
  resourceReportMatchesStatus,
} from './oauth-contract';

export type OAuthApiFailure =
  | 'unavailable'
  | 'unsupported-response'
  | 'ownership-lost'
  | 'capacity'
  | 'request-rejected'
  | 'timeout';

export class OAuthApiError extends Error {
  constructor(readonly reason: OAuthApiFailure) {
    super('Private mission request unavailable');
  }
}

const maximumResponseBytes = 131072;
const requestTimeoutMs = 10000;

async function readJson(response: Response, maximumBytes = maximumResponseBytes): Promise<unknown> {
  if (
    response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  ) {
    throw new OAuthApiError('unsupported-response');
  }
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      size += chunk.value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new OAuthApiError('unsupported-response');
      }
      chunks.push(chunk.value);
    }
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    return parsed;
  } catch {
    throw new OAuthApiError('unsupported-response');
  }
}

async function call(
  path: string,
  signal: AbortSignal,
  options: {
    csrfToken?: string;
    statuses?: readonly number[];
    maximumBytes?: number;
    unparsedStatuses?: readonly number[];
  } = {},
) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  const csrfToken = options.csrfToken;
  try {
    const response = await fetch(path, {
      method: csrfToken === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      mode: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
      // Firefox serializes Origin as null for a same-origin POST with no-referrer.
      // An origin-only policy preserves exact Origin/CSRF validation without a URL.
      referrerPolicy: csrfToken === undefined ? 'no-referrer' : 'strict-origin',
      headers:
        csrfToken === undefined
          ? { accept: 'application/json' }
          : { accept: 'application/json', 'X-Playground-CSRF': csrfToken },
      signal: AbortSignal.any([signal, timeout]),
    });
    if (!(options.statuses ?? [200]).includes(response.status)) {
      requireSuccess(response);
    }
    if (options.unparsedStatuses?.includes(response.status)) {
      const retry = response.headers.get('retry-after');
      const retryAfterSeconds =
        retry && /^\d{1,3}$/.test(retry) && Number(retry) > 0 && Number(retry) <= 300
          ? Number(retry)
          : null;
      await response.body?.cancel().catch(() => undefined);
      return { status: response.status, body: null, retryAfterSeconds };
    }
    return {
      status: response.status,
      body: await readJson(response, options.maximumBytes),
      retryAfterSeconds: null,
    };
  } catch (error) {
    if (error instanceof OAuthApiError) {
      throw error;
    }
    throw new OAuthApiError(timeout.aborted ? 'timeout' : 'unavailable');
  }
}

function requireSuccess(response: Response): void {
  if (response.status === 200) {
    return;
  }
  void response.body?.cancel().catch(() => undefined);
  switch (response.status) {
    case 404:
      throw new OAuthApiError('ownership-lost');
    case 503:
      throw new OAuthApiError('capacity');
    case 400:
    case 401:
    case 403:
      throw new OAuthApiError('request-rejected');
    default:
      throw new OAuthApiError('unavailable');
  }
}

function decode<Schema extends z.ZodType>(schema: Schema, value: unknown): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new OAuthApiError('unsupported-response');
  }
  return result.data;
}

export async function readOAuthSession(signal: AbortSignal) {
  const response = await call('/api/oauth/session', signal);
  return decode(oauthSessionSchema, response.body);
}

export async function readOAuthEvents(runId: string, signal: AbortSignal) {
  if (!oauthEventDocumentSchema.shape.runId.safeParse(runId).success) {
    throw new OAuthApiError('unsupported-response');
  }
  const response = await call(`/api/oauth/runs/${runId}/events`, signal);
  const document = decode(oauthEventDocumentSchema, response.body);
  if (document.runId !== runId) {
    throw new OAuthApiError('unsupported-response');
  }
  return document;
}

export async function readOAuthResource(signal: AbortSignal) {
  const response = await call('/api/oauth/resource', signal, {
    statuses: [200, 401, 403, 502, 504],
  });
  const result = decode(oauthResourceSchema, response.body);
  const consistent =
    (result.outcome === 'allowed' && response.status === 200) ||
    (result.outcome === 'denied' && (response.status === 401 || response.status === 403)) ||
    (result.outcome === 'rejected' && response.status === 401) ||
    (result.outcome === 'unavailable' &&
      response.status === (result.reason === 'timeout' ? 504 : 502));
  if (
    !consistent ||
    ('resourceServerReport' in result &&
      !resourceReportMatchesStatus(response.status, result.resourceServerReport))
  ) {
    throw new OAuthApiError('unsupported-response');
  }
  return { status: response.status, result };
}

export async function endOAuthSession(csrfToken: string, signal: AbortSignal) {
  if (!oauthSessionSchema.shape.csrfToken.safeParse(csrfToken).success) {
    throw new OAuthApiError('request-rejected');
  }
  const response = await call('/api/oauth/logout', signal, { csrfToken });
  const session = decode(oauthSessionSchema, response.body);
  if (session.authenticated) {
    throw new OAuthApiError('unsupported-response');
  }
  return session;
}

/** Selected reads share the existing same-origin transport and exact fixed API route. */
export async function readSelectedOAuthResource(selection: ResourceSelection, signal: AbortSignal) {
  if (
    !/^[A-Z][A-Za-z0-9]{0,63}$/.test(selection.resourceType) ||
    !/^[A-Za-z0-9.-]{1,64}$/.test(selection.resourceId) ||
    selection.resourceId.includes('..')
  ) {
    throw new OAuthApiError('request-rejected');
  }
  const query = new URLSearchParams({
    resourceType: selection.resourceType,
    resourceId: selection.resourceId,
  });
  const response = await call(`/api/oauth/resource?${query}`, signal, {
    statuses: [200, 400, 401, 403, 404, 429, 502, 504],
    unparsedStatuses: [400, 429],
    maximumBytes: 65536,
  });
  if (response.status === 429)
    return {
      status: 429,
      result: {
        outcome: 'throttled',
        source: 'boundary',
        retryAfterSeconds: response.retryAfterSeconds,
      } as const,
    };
  if (response.status === 400)
    return {
      status: 400,
      result: { outcome: 'rejected', source: 'bff', reason: 'invalid-selection' } as const,
    };
  const result = decode(selectedResourceResponseSchema, response.body);
  const consistent =
    (result.outcome === 'allowed' && response.status === 200) ||
    (result.outcome === 'denied' && [401, 403].includes(response.status)) ||
    (result.outcome === 'not-found' && response.status === 404) ||
    (result.outcome === 'rejected' &&
      response.status === (result.reason === 'selection-not-permitted' ? 403 : 401)) ||
    (result.outcome === 'unavailable' &&
      response.status === (result.reason === 'timeout' ? 504 : 502));
  if (
    !consistent ||
    ('resourceServerReport' in result &&
      !resourceReportMatchesStatus(response.status, result.resourceServerReport))
  )
    throw new OAuthApiError('unsupported-response');
  return { status: response.status, result };
}
