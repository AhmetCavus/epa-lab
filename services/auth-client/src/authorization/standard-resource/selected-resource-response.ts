import { z } from 'zod';
import {
  resourceFailureReasonSchema,
  resourceServerReportSchema,
} from '../run-observations/protocol-event';
import { safeSyntheticBasicSchema } from './synthetic-basic';

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

export function selectedResourceResponse(status: number, body: Record<string, unknown>) {
  return { status, body: selectedResourceResponseSchema.parse({ schemaVersion: 2, ...body }) };
}
