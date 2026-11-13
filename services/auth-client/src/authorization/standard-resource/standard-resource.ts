import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import type { configuration } from '../../config/configuration';
import { isSafeDemoResourceUrl } from '../../config/configuration.validation';
import { BoundedJsonError, readBoundedJson } from '../../common/http/response-json';
import type {
  ResourceFailureReason,
  ResourceServerReport,
} from '../run-observations/protocol-event';
import { readResourceServerReport } from './resource-report';

const syntheticBasicSchema = z.strictObject({
  resourceType: z.literal('Basic'),
  id: z.literal('playground-demo'),
  meta: z
    .strictObject({
      versionId: z.string().max(64).optional(),
      lastUpdated: z.string().datetime({ offset: true }).optional(),
      source: z.string().max(2048).optional(),
    })
    .optional(),
  code: z.strictObject({
    coding: z.tuple([
      z.strictObject({
        system: z.literal('https://example.invalid/playground/demo'),
        code: z.literal('oauth-learning-demo'),
        display: z.literal('Fictional protocol learning resource'),
      }),
    ]),
    text: z.literal('Synthetic non-clinical OAuth demonstration; no patient data'),
  }),
});
export interface SyntheticBasicView {
  resourceType: 'Basic';
  id: 'playground-demo';
  code: 'oauth-learning-demo';
}
export type ResourceResult =
  | { kind: 'allowed'; resource: SyntheticBasicView; report: ResourceServerReport }
  | { kind: 'denied'; status: 401 | 403; report: ResourceServerReport }
  | { kind: 'failed'; reason: ResourceFailureReason };

export async function readStandardResource(
  config: ConfigType<typeof configuration>,
  accessToken: string,
  received: (status: number, report: ResourceServerReport) => void,
): Promise<ResourceResult> {
  const profile = config.standardProfile;
  if (!profile || !isSafeDemoResourceUrl(profile.resourceUrl, config.allowPrivateNetworkHttp)) {
    return { kind: 'failed', reason: 'invalid-response' };
  }
  const signal = AbortSignal.timeout(config.httpTimeoutMs);
  try {
    const response = await fetch(profile.resourceUrl, {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/fhir+json' },
      redirect: 'error',
      signal,
    });
    const report = readResourceServerReport(response.status, response.headers);
    received(response.status, report);
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
      return response.status === 401 || response.status === 403
        ? { kind: 'denied', status: response.status, report }
        : { kind: 'failed', reason: 'unexpected-status' };
    }
    const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (mediaType !== 'application/fhir+json' && mediaType !== 'application/json') {
      await response.body?.cancel().catch(() => undefined);
      return { kind: 'failed', reason: 'invalid-response' };
    }
    const parsed = syntheticBasicSchema.safeParse(await readBoundedJson(response));
    if (!parsed.success) {
      return { kind: 'failed', reason: 'invalid-response' };
    }
    return {
      kind: 'allowed',
      report,
      resource: {
        resourceType: parsed.data.resourceType,
        id: parsed.data.id,
        code: parsed.data.code.coding[0].code,
      },
    };
  } catch (error) {
    if (signal.aborted) {
      return { kind: 'failed', reason: 'timeout' };
    }
    if (error instanceof BoundedJsonError) {
      return {
        kind: 'failed',
        reason: error.reason === 'response_too_large' ? 'response-too-large' : 'invalid-response',
      };
    }
    return { kind: 'failed', reason: 'network-error' };
  }
}
