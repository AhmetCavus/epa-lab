# UX / Architecture Review Gates

**Status:** DRAFT · **Purpose:** do not let implementation outrun product and UI design.

## Gate A — Product scope

- [ ] Primary audience, core value, first mission learning outcomes accepted.
- [ ] Catalog vs Workspace information architecture approved.
- [ ] Planned ePA mission cannot be mistaken for operational integration.

## Gate B — UX / visual design

- [ ] Catalog card template, availability states and CTAs approved.
- [ ] Workspace hierarchy: mission panel / protocol canvas / inspector / event timeline approved.
- [ ] Observed vs Explained vs Not Observable presentation reviewed.
- [ ] Redirect, return, fail, deny, logout, retry and empty states specified.
- [ ] Token/secret-safe evidence UI agreed.
- [ ] Both OAuth and **conceptual ePA fixture** fit one shell without special-case changes.
- [ ] High-fidelity desktop-browser mockup reviewed at common browser width and text size.
- [ ] Keyboard navigation, focus, contrast, no-color-only state, reduced motion reviewed.

## Gate C — Architecture

- [ ] ADR-0001 and ADR-0002 marked Accepted.
- [ ] Actor roles and front/back channels verified against protocol intent.
- [ ] BFF session, CSRF, trace provenance and Resource Server boundaries agreed.
- [ ] Repository boundary (`auth-protocol-playground` vs `epa-auth-lab`) decided.

## Gate D — Spec readiness

- [ ] First change proposal and Given/When/Then scenarios reviewed.
- [ ] Each visible action has an observable outcome and evidence strategy.
- [ ] Security-sensitive negative cases identified.
- [ ] No internal provider step presented as directly measured without instrumentation.
- [ ] Owner explicitly authorizes implementation.

## Gate E — Implementation and verification (later)

- [ ] A single end-to-end OAuth mission runs with a real pinned Keycloak instance.
- [ ] Resource Server validates issuer, audience, signature, time and permission.
- [ ] Failed/cancelled/denied paths and browser round-trip are verified.
- [ ] No leaked tokens, credentials or PKCE verifier in browser/logs/trace.
- [ ] UI states and accessibility pass review.

## Review record (fill after discussion)

| Date | Artifact | Decision | Approved by |
|---|---|---|---|
| — | Catalog / Workspace / ADRs | Pending | — |
