# Change 001 — Planning and Future Tasks

**Status:** OAuth/backend work remains DRAFT / PLANNING ONLY. The owner authorized the separate **UI Slice 001** below in `AGENTS.md` and requested its implementation. This exception does not approve the real-flow tasks.

## UI Slice 001 (authorized, fixture-only)

Boundary: an isolated React/TypeScript app in `apps/playground`, coexisting with the verified existing `epa-auth-lab` repository. No changes to existing backend, Android, infrastructure, or their configuration. This resolves the hosting boundary for this UI slice only; future backend integration remains an Open Decision.

- [x] UI-1: Create the isolated browser app and document local run commands and repository boundary.
- [x] UI-2: Implement a statically registered, honestly labeled two-mission catalog with working preview routes and planned availability.
- [x] UI-3: Implement the generic workspace with mission-owned objectives, checkpoints, grouped actors, selection, zoom/fit, and responsive keyboard-accessible layout for both fixtures.
- [x] UI-4: Implement explicitly loaded OAuth fixture samples, a timeline and Safe Evidence inspector with truthful provenance; keep the ePA preview conceptual with no operational results.
- [x] UI-5: Verify the UI slice with type/build checks and browser scenarios, document evidence and adaptations, and keep real OAuth approval/verification pending.

UI-only evidence: [`apps/playground/verification.md`](../../../apps/playground/verification.md). Original real-flow tasks below remain pending; this change is not approved or verified as a real OAuth implementation.

## Design and acceptance (authorized work)

- [ ] Review Catalog design: layout, availability, CTA states and accessibility.
- [ ] Review Workspace design: canvas, mission panel, timeline and inspector.
- [ ] Refine and approve high-fidelity visuals + state-specific mockups.
- [ ] Validate shell reuse with OAuth and conceptual ePA fixtures.
- [ ] Decide standalone repository vs `epa-auth-lab` integration.
- [ ] Approve ADR-0001 and ADR-0002.
- [ ] Approve OpenSpec scenarios and architecture event contract.
- [ ] Record explicit owner authorization for implementation.

## Implementation (BLOCKED until approval)

- [ ] Create only the packages/apps required by the approved first vertical slice.
- [ ] Configure a testable pinned Keycloak environment and demo realm.
- [ ] Implement confidential BFF OIDC Authorization Code + PKCE handling and app session.
- [ ] Implement mission registry/content and generic catalog/workspace views.
- [ ] Implement independent demo Resource Server authorization.
- [ ] Add typed safe event projection and event inspector.
- [ ] Connect UX states to actual observable outcomes; provide safe error/recovery flows.

## Verification (BLOCKED until implementation)

- [ ] Real Keycloak flow succeeds from a clean checkout.
- [ ] State/PKCE/OIDC callback errors do not create sessions.
- [ ] Anonymous/wrong-audience/missing-permission resource requests fail.
- [ ] Cookie/session and CSRF defenses tested appropriately.
- [ ] Sign-out invalidates the application session.
- [ ] No secrets or credentials appear in browser-accessible traces, storage or ordinary logs.
- [ ] UX and accessibility state checklist passes.
- [ ] Mark VERIFIED only with documented test evidence.
