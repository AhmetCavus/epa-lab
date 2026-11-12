# UX / Architecture Review Gates

**Status:** GATES A–D ACCEPTED FOR LOCAL/PRIVATE `001-oidc-pkce`; GATE E PENDING · **Purpose:** do not let implementation outrun product and UI design.

On 2026-11-11 the project owner accepted the complete reconciled first-mission plan, UX/visual baseline, ADR-0001/ADR-0002, security architecture and revised specifications, and authorized local/private tasks 2–9. Gates A–D below record that design/readiness acceptance, not runtime test results. Gate E remains unchecked; no implementation starts in this approval-recording step. See the [owner approval record](../../openspec/changes/001-oidc-pkce/readiness-review.md#consolidated-owner-approval-summary). Public authentication deployment is excluded; the existing public Playground stays fixture-only. The separate localization change's deferred owner copy review is unaffected.

## Gate A — Product scope

- [x] Primary audience, core value, first mission learning outcomes accepted.
- [x] Catalog vs Workspace information architecture approved.
- [x] Planned ePA mission cannot be mistaken for operational integration.

## Gate B — UX / visual design

- [x] Catalog card template, availability states and CTAs approved.
- [x] Workspace hierarchy: mission panel / protocol canvas / inspector / event timeline approved.
- [x] Observed vs Explained vs Not Observable presentation reviewed.
- [x] Redirect, return, fail, deny, logout, retry and empty states specified.
- [x] Token/secret-safe evidence UI agreed.
- [x] Both OAuth and **conceptual ePA fixture** fit one shell without special-case changes.
- [x] High-fidelity desktop-browser mockup reviewed at common browser width and text size.
- [x] Keyboard navigation, focus, contrast, no-color-only state, reduced motion reviewed.

## Gate C — Architecture

- [x] ADR-0001 and ADR-0002 marked Accepted.
- [x] Actor roles and front/back channels verified against protocol intent.
- [x] BFF session, CSRF, trace provenance and Resource Server boundaries agreed.
- [x] Repository boundary (`auth-protocol-playground` vs `epa-auth-lab`) decided.

## Gate D — Spec readiness

- [x] First change proposal and Given/When/Then scenarios reviewed.
- [x] Each visible action has an observable outcome and evidence strategy.
- [x] Security-sensitive negative cases identified.
- [x] No internal provider step presented as directly measured without instrumentation.
- [x] Owner explicitly authorizes implementation.

## Gate E — Implementation and verification (later)

- [ ] A single end-to-end OAuth mission runs with a real pinned Keycloak instance.
- [ ] Resource Server validates issuer, audience, signature, time and permission.
- [ ] Failed/cancelled/denied paths and browser round-trip are verified.
- [ ] No leaked tokens, credentials or PKCE verifier in browser/logs/trace.
- [ ] UI states and accessibility pass review.

## Review record

| Date       | Artifact                                                                         | Decision                                                     | Approved by                                              |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 2026-11-11 | `001-oidc-pkce`, reconciled Catalog/Workspace, ADR-0001/ADR-0002, security/specs | Accepted; local/private tasks 2–9 authorized; Gate E pending | Project owner, explicit instruction in this conversation |
