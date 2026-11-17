import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { z } from 'zod';
import {
  OAuthApiError,
  readOAuthResource,
  readSelectedOAuthResource,
} from '../src/features/mission/data/oauth-api';
import { selectedResourceResponseSchema } from '../src/features/mission/data/synthetic-resource-contract';
import { unsafeSentinel } from './oauth-runtime-fixture';

const selection = { resourceType: 'Basic', resourceId: 'playground-demo' };
const resource = {
  resourceType: 'Basic',
  id: 'playground-demo',
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
  meta: { versionId: '7', lastUpdated: '2026-11-16T12:00:00Z' },
};
const runId = crypto.randomUUID();
const allowed = {
  schemaVersion: 2,
  outcome: 'allowed',
  source: 'hapi',
  runId,
  resource,
  resourceServerReport: { available: false },
};

function producerModule(path: string): Record<string, unknown> {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports: Record<string, unknown> = {};
  const external = createRequire(import.meta.url);
  const require = (specifier: string): unknown =>
    specifier.startsWith('.')
      ? producerModule(resolve(dirname(path), `${specifier}.ts`))
      : external(specifier);
  new Function('require', 'exports', output.outputText)(require, exports);
  return exports;
}

async function response(
  body: unknown,
  status: number,
  run: (calls: { url: string; options: RequestInit }[]) => Promise<void>,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  const original = globalThis.fetch;
  const calls: { url: string; options: RequestInit }[] = [];
  globalThis.fetch = (url, options) => {
    calls.push({ url: String(url), options: options ?? {} });
    return Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }),
    );
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test('selected producer/consumer version-2 contracts agree while legacy version-1 contracts remain separate', async () => {
  const producer = producerModule(
    resolve(
      '../../services/auth-client/src/authorization/standard-resource/selected-resource-response.ts',
    ),
  ).selectedResourceResponseSchema;
  if (!(producer instanceof z.ZodType)) throw new Error('Producer unavailable');
  const examples = [
    allowed,
    {
      schemaVersion: 2,
      outcome: 'denied',
      source: 'hapi',
      runId,
      resourceServerReport: { available: false },
    },
    { schemaVersion: 2, outcome: 'not-found', source: 'hapi', runId },
    { schemaVersion: 2, outcome: 'rejected', source: 'bff', reason: 'authentication-required' },
    { schemaVersion: 2, outcome: 'rejected', source: 'bff', reason: 'selection-not-permitted' },
    { schemaVersion: 2, outcome: 'unavailable', source: 'bff', runId, reason: 'timeout' },
  ];
  for (const example of examples) {
    expect(producer.safeParse(example).success).toBe(true);
    expect(selectedResourceResponseSchema.safeParse(example).success).toBe(true);
  }
  await response(allowed, 200, async () => {
    await expect(readOAuthResource(new AbortController().signal)).rejects.toBeInstanceOf(
      OAuthApiError,
    );
  });
});

test('selected transport uses exactly two bounded selectors, same-origin cookies and no bearer/body', async () => {
  await response(allowed, 200, async (calls) => {
    const result = await readSelectedOAuthResource(selection, new AbortController().signal);
    expect(result.result).toEqual(allowed);
    expect(calls[0]?.url).toBe('/api/oauth/resource?resourceType=Basic&resourceId=playground-demo');
    expect(calls[0]?.options).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      mode: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
    });
    expect(new Headers(calls[0]?.options.headers).has('authorization')).toBe(false);
    expect(calls[0]?.options.body).toBeUndefined();
  });
});

for (const [status, outcome, source, extra] of [
  [
    401,
    'denied',
    'hapi',
    {
      resourceServerReport: {
        available: true,
        reportedBy: 'res-server',
        decision: 'denied',
        reason: 'invalid-token',
      },
    },
  ],
  [
    403,
    'denied',
    'hapi',
    {
      resourceServerReport: {
        available: true,
        reportedBy: 'res-server',
        decision: 'denied',
        reason: 'insufficient-permission',
      },
    },
  ],
  [404, 'not-found', 'hapi', {}],
  [401, 'rejected', 'bff', { reason: 'session-no-longer-active' }],
  [403, 'rejected', 'bff', { reason: 'selection-not-permitted' }],
] as const) {
  test(`selected HTTP ${status} ${source} ${outcome} retains the actual source`, async () => {
    const body = {
      schemaVersion: 2,
      outcome,
      source,
      ...(outcome === 'rejected' ? {} : { runId }),
      ...extra,
    };
    await response(body, status, async () => {
      expect(
        (await readSelectedOAuthResource(selection, new AbortController().signal)).result,
      ).toEqual(body);
    });
  });
}

test('429 accepts only bounded retry seconds and never parses a boundary error body', async () => {
  for (const retry of ['2', '999', '-1', 'http://unsafe.example', '']) {
    await response(
      unsafeSentinel,
      429,
      async () => {
        const result = await readSelectedOAuthResource(selection, new AbortController().signal);
        expect(result.result).toEqual({
          outcome: 'throttled',
          source: 'boundary',
          retryAfterSeconds: retry === '2' ? 2 : null,
        });
        expect(JSON.stringify(result)).not.toContain(unsafeSentinel);
      },
      { 'content-type': 'text/html', 'retry-after': retry },
    );
  }
});

test('selected decoding fails closed on invalid/unsafe/oversized/media/status/identity metadata', async () => {
  const bodies = [
    { ...allowed, schemaVersion: 3 },
    { ...allowed, headers: { authorization: unsafeSentinel } },
    { ...allowed, resource: { ...resource, id: 'another-id' } },
    { ...allowed, resource: { ...resource, resourceType: 'Patient' } },
    { ...allowed, resource: { ...resource, subject: { reference: unsafeSentinel } } },
    { ...allowed, resource: { ...resource, meta: { source: unsafeSentinel } } },
    { ...allowed, resource: { ...resource, meta: { versionId: `<${unsafeSentinel}>` } } },
    { ...allowed, resource: { ...resource, code: { text: unsafeSentinel } } },
    JSON.stringify(allowed) + ' '.repeat(70000),
    unsafeSentinel,
  ];
  for (const body of bodies) {
    await response(body, 200, async () => {
      await expect(
        readSelectedOAuthResource(selection, new AbortController().signal),
      ).rejects.toMatchObject({ reason: 'unsupported-response' });
    });
  }
  await response(
    allowed,
    200,
    async () => {
      await expect(
        readSelectedOAuthResource(selection, new AbortController().signal),
      ).rejects.toBeInstanceOf(OAuthApiError);
    },
    { 'content-type': 'text/plain' },
  );
  await response(allowed, 403, async () => {
    await expect(
      readSelectedOAuthResource(selection, new AbortController().signal),
    ).rejects.toBeInstanceOf(OAuthApiError);
  });
});

test('the documented selected-response example satisfies both actual contract boundaries', () => {
  const documentation = readFileSync('../../services/auth-client/README.md', 'utf8');
  const section = documentation.split('### Selected-resource extension (Mission Control v2)')[1];
  const sample = section?.match(/```json\n([\s\S]*?)\n```/)?.[1];
  if (!sample) throw new Error('Selected API example absent');
  const body: unknown = JSON.parse(sample);
  expect(selectedResourceResponseSchema.safeParse(body).success).toBe(true);
  const producer = producerModule(
    resolve(
      '../../services/auth-client/src/authorization/standard-resource/selected-resource-response.ts',
    ),
  ).selectedResourceResponseSchema;
  if (!(producer instanceof z.ZodType)) throw new Error('Producer unavailable');
  expect(producer.safeParse(body).success).toBe(true);
});
