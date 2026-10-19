# Change 001 — Solution Design

**Status:** DRAFT · **Architecture is a proposal, not a construction instruction.**

## Authorized UI Slice 001 boundary

The owner authorized a fixture-only React/TypeScript app in `apps/playground`. Inspection confirmed existing `services/epa-authorization`, infrastructure, and an Android placeholder; the starter's claim that no runtime code exists does not describe this checkout. The UI package is isolated and has its own build commands and dependencies. Existing services and configuration are preserved.

For this slice, mission declarations supply objectives, groups, actors, checkpoints and optional sample-loading actions. The shell owns selection, layout and viewport controls. Checkpoint selection is independent of loading or selecting sample events. OAuth evidence is projected from a mission-specific typed fixture allowlist into display fields. Every sample has no actual observer or timestamp and is labeled Fixture / Explained or Not observable. No runtime event API or execution adapter is introduced. The ePA layout preview contains conceptual explanations only.

**Open Decision:** Future real-event envelope, backend integration, final deployment boundary, and formal architecture approvals remain unresolved. The display contract in this UI is not approval of the future backend event contract.

## Design baseline

- Mission-agnostic React SPA shell hosts catalog, workspace, canvas, timeline, inspector.
- Mission-provided content and explicit actions; static registration initially.
- NestJS BFF is confidential OAuth/OIDC client and server-side token/session owner.
- Keycloak is Authorization Server and IdP (separate logical roles in UI, one deployment).
- Demo Resource Server is independent authorization boundary for an Access Token.
- Both browser redirects and BFF-to-Keycloak back-channel requests are explained distinctly.

Read: `docs/design/mission-workspace.md`, `docs/architecture/system-context.md`, ADR-0001, ADR-0002.

## Trust model

No bearer credentials, authorization codes, PKCE verifiers, client secrets, session secrets or raw callback URLs in browser-exposed trace records. Record only allowlisted, typed events and educational explanations as separate objects. The BFF controls one-time correlated login transactions and validates returned OIDC response; BFF session cookie is HttpOnly with Secure when over HTTPS, appropriate SameSite and CSRF protection. Resource Server verifies Access Token claims independently.

## Event design question (to resolve before coding)

Do we model a single cross-mission event envelope with fields `eventId`, `runId`, `at`, `observedBy`, `sourceActorId`, `targetActorId`, `outcome`, plus typed mission-specific safe details? If yes, how is observer provenance enforced and how do we avoid any arbitrary metadata map? Draft in ADR-0002; needs review.

## UI interaction design question

How does the selected learning step relate to the last observed network event after a full browser redirect? The proposed answer is: learning step is navigable pedagogical state, while network event is an immutable observed trace entry. Do not advance one just because the other advanced.

## Infrastructure status

This change authorizes no new compose configuration, realm, backend services, OAuth client library or backend port assignments. Repository inspection confirmed existing `epa-auth-lab` runtime components; UI Slice 001 coexists with them without integration. The future real-flow infrastructure design and integration boundary remain open.

## Design approval criteria

- Correct role mapping and AS/IdP logical grouping.
- Two distinct demo fixtures render in one generic workspace.
- UX redirect/error/sign-out states are defined.
- Security-negative scenarios are testable.
- Explicit sign-off for implementation.
