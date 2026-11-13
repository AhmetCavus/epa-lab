import { randomUUID } from 'node:crypto';
import type { Page, Route } from '@playwright/test';
import { oauthEventSchema } from '../src/features/mission/data/oauth-contract';
import type {
  OAuthEvent,
  OAuthEventDocument,
  OAuthSession,
} from '../src/features/mission/data/oauth-contract';

export const privateBaseUrl = 'http://127.0.0.1:4174';
export const workspacePath = '/missions/oauth-oidc/workspace';
export const csrfSentinel = 'c'.repeat(43);
export const unsafeSentinel = 'fictional-sensitive-protocol-data';

export function observedEvent(runId: string, sequence: number, observation: object): OAuthEvent {
  return oauthEventSchema.parse({
    ...observation,
    schemaVersion: 1,
    eventId: randomUUID(),
    runId,
    sequence,
    observedAt: new Date(Date.now() - 1000 + sequence).toISOString(),
    observedBy: 'auth-client',
  });
}

export function loginEvents(runId: string): OAuthEvent[] {
  const local = { channel: 'actor-local', actorId: 'bff' };
  const toBrowser = { channel: 'front-channel', sourceActorId: 'bff', targetActorId: 'browser' };
  const observations = [
    {
      ...local,
      kind: 'authorization-started',
      outcome: 'pending',
      evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
    },
    {
      ...toBrowser,
      kind: 'authorization-redirect-issued',
      outcome: 'issued',
      evidence: {
        httpStatus: 302,
        destinationActorId: 'authorization-server',
        responseType: 'code',
        pkceMethod: 'S256',
      },
    },
    {
      channel: 'front-channel',
      sourceActorId: 'browser',
      targetActorId: 'bff',
      kind: 'callback-accepted',
      outcome: 'accepted',
      evidence: { correlation: 'matched', response: 'code' },
    },
    {
      channel: 'back-channel',
      sourceActorId: 'bff',
      targetActorId: 'authorization-server',
      kind: 'token-exchange-started',
      outcome: 'pending',
      evidence: { grantType: 'authorization_code', pkceMethod: 'S256' },
    },
    {
      channel: 'back-channel',
      sourceActorId: 'authorization-server',
      targetActorId: 'bff',
      kind: 'token-response-received',
      outcome: 'received',
      evidence: { httpStatus: 200 },
    },
    {
      ...local,
      kind: 'token-validation-started',
      outcome: 'pending',
      evidence: { tokenPurpose: 'id-token' },
    },
    {
      ...local,
      kind: 'token-validation-succeeded',
      outcome: 'accepted',
      evidence: { tokenPurpose: 'id-token' },
    },
    {
      ...local,
      kind: 'session-established',
      outcome: 'authenticated',
      evidence: { contextRotated: true },
    },
    {
      ...toBrowser,
      kind: 'workspace-redirect-issued',
      outcome: 'issued',
      evidence: { httpStatus: 303, target: 'oauth-workspace' },
    },
  ];
  return observations.map((event, index) => observedEvent(runId, index + 1, event));
}

export function runtimeFixture(authenticated = true) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const runId = randomUUID();
  let session: OAuthSession = {
    authenticated,
    expiresAt: authenticated ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
    csrfToken: csrfSentinel,
    currentRun: authenticated
      ? { runId, outcome: 'authenticated', expiresAt, observationsAvailable: true }
      : null,
  };
  let document: OAuthEventDocument = {
    schemaVersion: 1,
    runId,
    expiresAt,
    complete: true,
    events: authenticated ? loginEvents(runId) : [],
  };
  let resourceStatus: 200 | 401 | 403 = 200;
  let reportAvailable = true;
  let eventsOverride: unknown;
  let sessionOverride: unknown;
  let eventStatus = 200;
  let logoutEventFailure = false;
  let responseGate: Promise<void> | undefined;
  const calls: {
    method: string;
    path: string;
    navigation: boolean;
    csrfValid: boolean;
    sameOrigin: boolean;
    bearer: boolean;
  }[] = [];

  const append = (observation: object) => {
    document.events.push(observedEvent(document.runId, document.events.length + 1, observation));
  };
  async function json(route: Route, status: number, body: unknown) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(body),
    });
  }
  async function install(page: Page) {
    await page.route(`${privateBaseUrl}/api/oauth/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = await request.allHeaders();
      calls.push({
        method: request.method(),
        path: url.pathname,
        navigation: request.isNavigationRequest(),
        csrfValid: headers['x-playground-csrf'] === session.csrfToken,
        sameOrigin: url.origin === privateBaseUrl,
        bearer: 'authorization' in headers,
      });
      if (url.pathname === '/api/oauth/login') {
        const freshId = randomUUID();
        document = { ...document, runId: freshId, events: loginEvents(freshId) };
        session = {
          ...session,
          authenticated: true,
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          currentRun: {
            runId: freshId,
            outcome: 'authenticated',
            expiresAt,
            observationsAvailable: true,
          },
        };
        await route.fulfill({ status: 302, headers: { Location: workspacePath } });
      } else if (url.pathname === '/api/oauth/session') {
        await json(route, 200, sessionOverride ?? session);
      } else if (url.pathname.endsWith('/events')) {
        await json(route, eventStatus, eventsOverride ?? document);
      } else if (url.pathname === '/api/oauth/resource') {
        await responseGate;
        const report = !reportAvailable
          ? { available: false }
          : resourceStatus === 200
            ? {
                available: true,
                reportedBy: 'res-server',
                decision: 'allowed',
                reason: 'demo-read-allowed',
              }
            : {
                available: true,
                reportedBy: 'res-server',
                decision: 'denied',
                reason: resourceStatus === 401 ? 'invalid-token' : 'insufficient-permission',
              };
        append({
          kind: 'resource-requested',
          channel: 'back-channel',
          sourceActorId: 'bff',
          targetActorId: 'resource-server',
          outcome: 'pending',
          evidence: { operation: 'read-demo-basic', method: 'GET' },
        });
        append({
          kind: 'resource-response-received',
          channel: 'back-channel',
          sourceActorId: 'resource-server',
          targetActorId: 'bff',
          outcome: 'received',
          evidence: {
            operation: 'read-demo-basic',
            httpStatus: resourceStatus,
            resourceServerReport: report,
          },
        });
        append({
          kind: resourceStatus === 200 ? 'resource-allowed' : 'resource-denied',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: resourceStatus === 200 ? 'allowed' : 'denied',
          evidence: { operation: 'read-demo-basic', httpStatus: resourceStatus },
        });
        await json(route, resourceStatus, {
          outcome: resourceStatus === 200 ? 'allowed' : 'denied',
          runId: document.runId,
          resourceServerReport: report,
          ...(resourceStatus === 200
            ? {
                resource: {
                  resourceType: 'Basic',
                  id: 'playground-demo',
                  code: 'oauth-learning-demo',
                },
              }
            : {}),
        });
      } else if (url.pathname === '/api/oauth/logout') {
        session = {
          ...session,
          authenticated: false,
          expiresAt: null,
          currentRun: session.currentRun
            ? {
                ...session.currentRun,
                outcome: 'signed-out',
                observationsAvailable: !logoutEventFailure,
              }
            : null,
        };
        if (logoutEventFailure) {
          eventStatus = 500;
        } else {
          append({
            kind: 'session-ended',
            channel: 'actor-local',
            actorId: 'bff',
            outcome: 'signed-out',
            evidence: { reason: 'local-logout', authenticationRemoved: true },
          });
        }
        await json(route, 200, session);
      } else {
        await json(route, 404, { errorCode: 'noResource', errorDetail: unsafeSentinel });
      }
    });
  }
  return {
    install,
    calls,
    get session() {
      return session;
    },
    get document() {
      return document;
    },
    setSession(value: OAuthSession) {
      session = value;
    },
    setResourceStatus(value: 200 | 401 | 403) {
      resourceStatus = value;
    },
    setReportAvailable(value: boolean) {
      reportAvailable = value;
    },
    setEvents(value: unknown) {
      eventsOverride = value;
    },
    setSessionResponse(value: unknown) {
      sessionOverride = value;
    },
    setEventStatus(value: number) {
      eventStatus = value;
    },
    failLogoutObservation() {
      logoutEventFailure = true;
    },
    gateResource(value: Promise<void>) {
      responseGate = value;
    },
  };
}
