import { z } from 'zod';
import type { SimulatedEvent } from '../../protocol-flow/contracts';

const actor = z.enum([
  'user',
  'browser',
  'bff',
  'authorization-server',
  'identity-provider',
  'resource-server',
  'insured-person',
  'fdv',
  'sectoral-idp',
  'epa-authorization',
  'vau',
]);
const contentKey = z.string().regex(/^mission:simulation\.[a-zA-Z0-9.-]+$/);
const outcome = z.enum(['pending', 'succeeded', 'rejected', 'denied', 'established', 'allowed']);
const common = {
  id: z.string().regex(/^simulation:(oauth|epa):[1-9]\d{0,8}:[a-z-]+$/),
  titleKey: contentKey,
  summaryKey: contentKey,
  explanationKey: contentKey,
  visibility: z.literal('simulated'),
  evidence: z
    .array(
      z.strictObject({
        labelKey: contentKey,
        value: z.discriminatedUnion('kind', [
          z.strictObject({
            kind: z.literal('literal'),
            value: z.enum([
              'code',
              'S256',
              'PAR',
              'request_uri',
              'Basic',
              'playground-demo',
              'demo.fhir.read',
              'simulation',
            ]),
          }),
          z.strictObject({ kind: z.literal('text'), key: contentKey }),
        ]),
      }),
    )
    .max(4),
  simulation: z.strictObject({
    traceId: z.string().regex(/^simulation:(oauth|epa):[1-9]\d{0,8}$/),
    sequence: z.number().int().min(1).max(32),
    elapsedMs: z.number().int().min(0).max(60000),
    outcome,
    outcomeKey: z
      .string()
      .regex(
        /^protocol-flow:simulation\.outcomes\.(pending|succeeded|rejected|denied|established|allowed)$/,
      ),
    conceptual: z.boolean(),
  }),
};

const eventSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...common,
      kind: z.literal('message'),
      sourceActorId: actor,
      targetActorId: actor,
      channel: z.union([
        z.strictObject({
          kind: z.literal('front'),
          labelKey: z.literal('protocol-flow:channels.front'),
        }),
        z.strictObject({
          kind: z.literal('back'),
          labelKey: z.literal('protocol-flow:channels.back'),
        }),
      ]),
    }),
    z.strictObject({
      ...common,
      kind: z.literal('internal'),
      actorId: actor,
      channel: z.strictObject({
        kind: z.literal('internal'),
        labelKey: z.literal('protocol-flow:simulation.local'),
      }),
    }),
  ])
  .refine(
    (event) =>
      event.id.startsWith(`${event.simulation.traceId}:`) &&
      event.simulation.outcomeKey.endsWith(`.${event.simulation.outcome}`) &&
      event.simulation.conceptual === event.simulation.traceId.startsWith('simulation:epa:') &&
      (event.kind !== 'message' || event.sourceActorId !== event.targetActorId),
  );

/** Local content boundary only. This schema is never an OAuth wire decoder. */
export function parseSimulationEvent(value: unknown): SimulatedEvent {
  return eventSchema.parse(value);
}
