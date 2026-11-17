import { z } from 'zod';
import { resourceFailureReasonSchema, resourceServerReportSchema } from './oauth-contract';

export const safeSyntheticBasicSchema = z.strictObject({
  resourceType: z.literal('Basic'),
  id: z.literal('playground-demo'),
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
  meta: z
    .strictObject({
      versionId: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[A-Za-z0-9.-]+$/)
        .optional(),
      lastUpdated: z.string().datetime({ offset: true }).optional(),
    })
    .optional(),
});

const version = { schemaVersion: z.literal(2) };
export const selectedResourceResponseSchema = z.discriminatedUnion('outcome', [
  z.strictObject({
    ...version,
    outcome: z.literal('allowed'),
    source: z.literal('hapi'),
    runId: z.uuid(),
    resource: safeSyntheticBasicSchema,
    resourceServerReport: resourceServerReportSchema,
  }),
  z.strictObject({
    ...version,
    outcome: z.literal('denied'),
    source: z.literal('hapi'),
    runId: z.uuid(),
    resourceServerReport: resourceServerReportSchema,
  }),
  z.strictObject({
    ...version,
    outcome: z.literal('not-found'),
    source: z.literal('hapi'),
    runId: z.uuid(),
  }),
  z.strictObject({
    ...version,
    outcome: z.literal('rejected'),
    source: z.literal('bff'),
    reason: z.enum([
      'authentication-required',
      'session-no-longer-active',
      'selection-not-permitted',
    ]),
  }),
  z.strictObject({
    ...version,
    outcome: z.literal('unavailable'),
    source: z.literal('bff'),
    runId: z.uuid(),
    reason: resourceFailureReasonSchema,
  }),
]);
