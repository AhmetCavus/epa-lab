// Version-1 auth-client wire contract, validated again at the standalone SPA boundary.
// Producer/consumer compatibility is tested without coupling the deployed bundles.
import { z } from 'zod';

export const maximumEventsPerRun = 100;
export const demoReadOperation = 'read-demo-basic';

export const resourceServerReportSchema = z.union([
  z.strictObject({ available: z.literal(false) }),
  z.strictObject({
    available: z.literal(true),
    reportedBy: z.literal('res-server'),
    decision: z.literal('allowed'),
    reason: z.literal('demo-read-allowed'),
  }),
  z.strictObject({
    available: z.literal(true),
    reportedBy: z.literal('res-server'),
    decision: z.literal('denied'),
    reason: z.enum([
      'missing-token',
      'invalid-token',
      'insufficient-permission',
      'operation-not-allowed',
    ]),
  }),
]);
export type ResourceServerReport = z.infer<typeof resourceServerReportSchema>;

export function resourceReportMatchesStatus(status: number, report: ResourceServerReport): boolean {
  if (!report.available) {
    return true;
  }
  if (report.decision === 'allowed') {
    return status === 200;
  }
  return (
    (status === 401 && (report.reason === 'missing-token' || report.reason === 'invalid-token')) ||
    (status === 403 &&
      (report.reason === 'insufficient-permission' || report.reason === 'operation-not-allowed'))
  );
}

const common = {
  schemaVersion: z.literal(1),
  eventId: z.uuid(),
  runId: z.uuid(),
  sequence: z.number().int().min(1).max(maximumEventsPerRun),
  observedAt: z.iso.datetime(),
  observedBy: z.literal('auth-client'),
};
const local = { channel: z.literal('actor-local'), actorId: z.literal('bff') };
const browserResponse = {
  channel: z.literal('front-channel'),
  sourceActorId: z.literal('bff'),
  targetActorId: z.literal('browser'),
};
const tokenRequest = {
  channel: z.literal('back-channel'),
  sourceActorId: z.literal('bff'),
  targetActorId: z.literal('authorization-server'),
};
export const resourceFailureReasonSchema = z.enum([
  'timeout',
  'network-error',
  'unexpected-status',
  'invalid-response',
  'response-too-large',
]);
export type ResourceFailureReason = z.infer<typeof resourceFailureReasonSchema>;

/** Finite mission observations. No provider-internal kind or unrestricted evidence is accepted. */
export const oauthEventSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('authorization-started'),
    outcome: z.literal('pending'),
    evidence: z.strictObject({
      responseType: z.literal('code'),
      pkceMethod: z.literal('S256'),
      authorizationMode: z.literal('direct'),
    }),
  }),
  z.strictObject({
    ...common,
    ...browserResponse,
    kind: z.literal('authorization-redirect-issued'),
    outcome: z.literal('issued'),
    evidence: z.strictObject({
      httpStatus: z.literal(302),
      destinationActorId: z.literal('authorization-server'),
      responseType: z.literal('code'),
      pkceMethod: z.literal('S256'),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('authorization-failed'),
    outcome: z.literal('failed'),
    evidence: z.strictObject({ reason: z.literal('authorization-unavailable') }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('authorization-cancelled'),
    outcome: z.literal('cancelled'),
    evidence: z.strictObject({ reason: z.enum(['superseded', 'local-logout', 'expired']) }),
  }),
  z.strictObject({
    ...common,
    channel: z.literal('front-channel'),
    sourceActorId: z.literal('browser'),
    targetActorId: z.literal('bff'),
    kind: z.literal('callback-accepted'),
    outcome: z.literal('accepted'),
    evidence: z.strictObject({
      correlation: z.literal('matched'),
      response: z.enum(['code', 'provider-error']),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('callback-rejected'),
    outcome: z.literal('rejected'),
    evidence: z.strictObject({
      reason: z.enum([
        'provider-denied',
        'context-ineligible',
        'malformed-callback',
        'issuer-mismatch',
      ]),
    }),
  }),
  z.strictObject({
    ...common,
    ...tokenRequest,
    kind: z.literal('token-exchange-started'),
    outcome: z.literal('pending'),
    evidence: z.strictObject({
      grantType: z.literal('authorization_code'),
      pkceMethod: z.literal('S256'),
    }),
  }),
  z.strictObject({
    ...common,
    channel: z.literal('back-channel'),
    sourceActorId: z.literal('authorization-server'),
    targetActorId: z.literal('bff'),
    kind: z.literal('token-response-received'),
    outcome: z.literal('received'),
    evidence: z.strictObject({ httpStatus: z.literal(200) }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('token-exchange-failed'),
    outcome: z.literal('failed'),
    evidence: z.strictObject({
      reason: z.enum(['timeout', 'network-error', 'provider-rejected', 'invalid-response']),
      httpStatus: z.number().int().min(100).max(599).optional(),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('token-validation-started'),
    outcome: z.literal('pending'),
    evidence: z.strictObject({ tokenPurpose: z.literal('id-token') }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('token-validation-succeeded'),
    outcome: z.literal('accepted'),
    evidence: z.strictObject({ tokenPurpose: z.literal('id-token') }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('token-validation-failed'),
    outcome: z.literal('rejected'),
    evidence: z.strictObject({ reason: z.literal('oidc-validation-failed') }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('session-established'),
    outcome: z.literal('authenticated'),
    evidence: z.strictObject({ contextRotated: z.literal(true) }),
  }),
  z.strictObject({
    ...common,
    ...browserResponse,
    kind: z.literal('workspace-redirect-issued'),
    outcome: z.literal('issued'),
    evidence: z.strictObject({ httpStatus: z.literal(303), target: z.literal('oauth-workspace') }),
  }),
  z
    .strictObject({
      ...common,
      ...local,
      kind: z.literal('session-ended'),
      outcome: z.enum(['signed-out', 'expired']),
      evidence: z.strictObject({
        reason: z.enum(['local-logout', 'token-expired']),
        authenticationRemoved: z.boolean(),
      }),
    })
    .refine(
      (event) => (event.outcome === 'signed-out') === (event.evidence.reason === 'local-logout'),
    ),
  z.strictObject({
    ...common,
    channel: z.literal('back-channel'),
    sourceActorId: z.literal('bff'),
    targetActorId: z.literal('resource-server'),
    kind: z.literal('resource-requested'),
    outcome: z.literal('pending'),
    evidence: z.strictObject({ operation: z.literal(demoReadOperation), method: z.literal('GET') }),
  }),
  z
    .strictObject({
      ...common,
      channel: z.literal('back-channel'),
      sourceActorId: z.literal('resource-server'),
      targetActorId: z.literal('bff'),
      kind: z.literal('resource-response-received'),
      outcome: z.literal('received'),
      evidence: z.strictObject({
        operation: z.literal(demoReadOperation),
        httpStatus: z.number().int().min(100).max(599),
        resourceServerReport: resourceServerReportSchema,
      }),
    })
    .refine((event) =>
      resourceReportMatchesStatus(event.evidence.httpStatus, event.evidence.resourceServerReport),
    ),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('resource-allowed'),
    outcome: z.literal('allowed'),
    evidence: z.strictObject({
      operation: z.literal(demoReadOperation),
      httpStatus: z.literal(200),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('resource-denied'),
    outcome: z.literal('denied'),
    evidence: z.strictObject({
      operation: z.literal(demoReadOperation),
      httpStatus: z.union([z.literal(401), z.literal(403)]),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('resource-rejected'),
    outcome: z.literal('rejected'),
    evidence: z.strictObject({
      operation: z.literal(demoReadOperation),
      httpStatus: z.literal(401),
      reason: z.enum(['authentication-required', 'session-no-longer-active']),
    }),
  }),
  z.strictObject({
    ...common,
    ...local,
    kind: z.literal('resource-failed'),
    outcome: z.literal('failed'),
    evidence: z.strictObject({
      operation: z.literal(demoReadOperation),
      reason: resourceFailureReasonSchema,
    }),
  }),
]);

export type OAuthEvent = z.infer<typeof oauthEventSchema>;
export const oauthEventDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    runId: z.uuid(),
    expiresAt: z.iso.datetime(),
    complete: z.boolean(),
    events: z.array(oauthEventSchema).max(maximumEventsPerRun),
  })
  .superRefine((document, context) => {
    const ids = new Set<string>();
    for (const [index, event] of document.events.entries()) {
      if (
        event.runId !== document.runId ||
        event.sequence !== index + 1 ||
        ids.has(event.eventId)
      ) {
        context.addIssue({ code: 'custom', message: 'Invalid observation identity or sequence' });
      }
      ids.add(event.eventId);
    }
  });
export type OAuthEventDocument = z.infer<typeof oauthEventDocumentSchema>;

export const oauthSessionSchema = z
  .strictObject({
    authenticated: z.boolean(),
    expiresAt: z.iso.datetime().nullable(),
    csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    currentRun: z
      .strictObject({
        runId: z.uuid(),
        outcome: z.enum([
          'pending',
          'authenticated',
          'provider-denied',
          'authentication-failed',
          'signed-out',
          'cancelled',
          'expired',
        ]),
        expiresAt: z.iso.datetime(),
        observationsAvailable: z.boolean(),
      })
      .nullable(),
  })
  .refine((session) => session.authenticated === (session.expiresAt !== null));

export type OAuthSession = z.infer<typeof oauthSessionSchema>;

export const oauthResourceSchema = z.discriminatedUnion('outcome', [
  z.strictObject({
    outcome: z.literal('allowed'),
    runId: z.uuid(),
    resource: z.strictObject({
      resourceType: z.literal('Basic'),
      id: z.literal('playground-demo'),
      code: z.literal('oauth-learning-demo'),
    }),
    resourceServerReport: resourceServerReportSchema,
  }),
  z.strictObject({
    outcome: z.literal('denied'),
    runId: z.uuid(),
    resourceServerReport: resourceServerReportSchema,
  }),
  z.strictObject({
    outcome: z.literal('rejected'),
    reason: z.enum(['authentication-required', 'session-no-longer-active']),
  }),
  z.strictObject({
    outcome: z.literal('unavailable'),
    runId: z.uuid(),
    reason: resourceFailureReasonSchema,
  }),
]);
export type OAuthResource = z.infer<typeof oauthResourceSchema>;
