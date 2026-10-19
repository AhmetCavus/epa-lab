# UI Slice 001 — Verification record

Date: 2026-10-17. Scope: owner-authorized fixture UI only. The overall OIDC/PKCE change and real authentication/backend capabilities remain DRAFT; this record does not mark that change VERIFIED or approve its ADRs.

## Implementation boundary

- Isolated React/TypeScript app in `apps/playground`, with its own pinned dependencies, npm lockfile and commands. Existing root package scripts, pnpm workspace/lock, backend, infrastructure and Android placeholder are unchanged by this work.
- One statically registered catalog and workspace for both definitions; no protocol names or mission-ID branching in the reusable workspace. OAuth sample details are projected from a discriminated, mission-owned allowlist. This is a fixture display contract, not a future backend event contract.
- Learning checkpoint, actor and sample selection are separate. The timeline initially has no entries. Loading OAuth samples does not select a checkpoint or perform a request. Reset preserves samples; replay selects their first explanation. No execution/session state or persistence exists.
- ePA remains Planned. Its preview is an actor/responsibility layout with no event samples, operational choreography, simulated results, TI connectivity or compliance claims.

## Evidence

Commands run from the repository root:

```sh
npm --prefix apps/playground run typecheck
npm --prefix apps/playground run format:check
npm --prefix apps/playground test
openspec validate 001-oidc-pkce --json
```

On this Windows workstation, Node's system certificate store was enabled for installation with `NODE_USE_SYSTEM_CA=1`. Browser binaries were installed under the ignored app cache, and tests used `PLAYWRIGHT_BROWSERS_PATH=<app>/.cache/browsers`. Standard Playwright browser installation also works with the documented commands.

Results:

- Strict TypeScript and production Vite build pass.
- Prettier check passes for the UI package.
- Six Chromium browser scenarios pass against the production build. They cover keyboard preview navigation and focus, browser back/forward, direct URLs, unknown routes, loading samples, independent selection, highlighted actors, truthful provenance, provider-internal visibility, reset/replay, map zoom/fit, conceptual-only ePA, and transient-state reset on refresh.
- Automated axe checks report zero WCAG A/AA violations across the catalog and both workspace previews at 1366×768, 1024×768 and 390×844 (nine scans), with reduced motion enabled. No horizontal document overflow occurs at those widths; the map can scroll independently, and Fit brings all actor groups into view. At narrower widths, the inspector follows the canvas.
- The interaction scenario records no fetch/XHR or external-origin requests, browser errors, local/session storage entries, or cookies. Sample evidence has no actual observer or timestamp and displays no credential values.
- OpenSpec CLI validation passes after normalizing the existing drafts to delta/requirement/scenario headings. OAuth scenarios retain their draft status and intent.
- App dependency audit reports zero known vulnerabilities at verification time.
- Generated desktop and narrow-viewport screenshots were visually inspected against both mandatory PNG references. Reproducible screenshots are emitted to ignored `test-results/`; this is evidence of the implementation, not owner visual sign-off.

## Deliberate visual and behavior adaptations

The UI carries forward the navy surfaces, cyan emphasis, two-card hierarchy, left checkpoint panel, central actor canvas, inspector and timeline. CSS-drawn identity/boundary artwork replaces speculative imagery; no additional mission families, decorative controls, duration estimates, metrics or unverified Available labels are introduced. The introductory content is compact and inline.

Safe Evidence replaces Raw Data. Fixture explanation order is explicitly separate from observed event order, and samples carry no fabricated timestamps, success indicators or authenticated status. Provider-internal checks are Not observable. Keycloak's two roles appear inside a single deployment group. The ePA map has no request arrows or fabricated choreography.

Loading, provider redirects, real success/denial, retry, logout and service-unavailable states require real execution capabilities and are not fabricated for this synchronous preview. Disabled controls explain their state through visible labels/context. Unknown routes offer recovery to the catalog.

## Limits and open decisions

Automated accessibility checks and keyboard scenarios do not establish full WCAG conformance; screen-reader and broader browser review remain future review work. Verification uses Chromium only. Backend integration, deployed routing fallback, the real-event envelope, live protocol results, formal architecture acceptance and the original real-OAuth checklist remain open and require explicit approval. No application has been deployed or published.

## OpenSpec verification — UI Slice 001

Verification date: 2026-10-17. Change: `001-oidc-pkce`; schema: `spec-driven`. This review checks the authorized UI slice, rather than treating the entire draft change as implemented. No implementation, task checkboxes, approval status or archive state was changed during verification.

| Dimension    | UI Slice 001 assessment                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | 5/5 UI tasks complete; 5/5 applicable ADDED requirements found. Overall change: 5/28 tasks complete.                                                            |
| Correctness  | All five applicable requirements and their five scenarios map to implementation and browser-test evidence. Fresh production build and six browser tests pass.   |
| Coherence    | Workspace boundaries, fixture provenance, static registration, role grouping, file structure and visual hierarchy are followed. One catalog-copy warning below. |

The five applicable requirements comprise the four explicit UI requirements plus the shared-workspace requirement in `mission-experience/spec.md`. The other nine requirements and eleven scenarios concern future real execution and were **Not verified: outside the requested UI-only scope and not authorized for implementation**. There are no REMOVED or RENAMED requirements. Full-change archive readiness is not established by this report.

### Requirement and scenario evidence

Paths below are relative to this package unless prefixed with `openspec/`.

| Requirement / scenario                                                     | Implementation evidence                                                                                                                                                    | Verification evidence                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture catalog and routing / Catalog and routing                          | `src/catalog/Catalog.tsx`, `src/App.tsx`, `src/NotFound.tsx`, static mission registry                                                                                      | Catalog navigation scenario checks honest labels, keyboard activation, focus, direct route, back/forward and both previews; concept scenario checks unknown routes.                                                                                                        |
| Independent learning and fixture selection / Selecting learning content    | `src/workspace/Workspace.tsx`: separate checkpoint, actor, event and sample-loading state                                                                                  | Selection scenario verifies learning navigation creates no samples, sample selection preserves the learning checkpoint, actor selection changes context, and interactions make no fetch/XHR or external-origin requests.                                                   |
| Honest samples and safe inspection / Loading and inspecting samples        | `src/missions/oauth.ts`: discriminated fixture allowlist; `src/workspace/Inspector.tsx` and `Timeline.tsx`: explicit fixture provenance and interpretation                 | Selection scenario verifies absent observer/timestamp, example-only details, Not observable provider internals, highlighted actors, reset/replay preservation, no live run, empty storage/cookies and no browser errors. Concept scenario confirms ePA cannot load events. |
| Responsive accessible interaction / Navigating at different browser widths | `src/styles.css`, `src/workspace/ActorCanvas.tsx`, viewport controls and native buttons/links                                                                              | Three responsive scenarios cover 1366, 1024 and 390 pixels, nine axe scans, document overflow, working Fit and inspector stacking; selection/navigation scenarios cover keyboard operation and focus.                                                                      |
| The workspace is not OAuth-specific / Rendering different design fixtures  | Same `Workspace` and child components receive either definition; only generic preview-kind branching; no mission-ID conditionals or protocol nouns in workspace components | Both fixtures render through the same route/component; concept scenario confirms no executable action or telemetry. Code inspection confirms correct BFF client role and one Keycloak deployment grouping.                                                                 |

Fresh checks executed:

- `npm --prefix apps/playground test`: strict TypeScript, production build, and **6 passed** Chromium scenarios.
- `npm --prefix apps/playground run format:check`: passed.
- `openspec validate 001-oidc-pkce --strict --json`: passed with no issues.
- `npm audit --prefix apps/playground --json`: zero known vulnerabilities at this verification.
- `git diff --check`: passed. Existing root runtime configuration, backend, infrastructure and Android placeholder match HEAD.
- Additional browser inspection at 320 and 683 pixels: catalog and both workspaces have no horizontal document overflow. These are reflow checks, not an actual browser-zoom or screen-reader conformance assessment.
- Both baseline PNGs and current generated desktop screenshots were inspected; the recognizable navy/cyan styling, catalog hierarchy and workspace panels are retained. This is not owner visual approval.

### Findings by priority

**CRITICAL — UI Slice 001:** None found.

**WARNING W1 — Protocol-specific copy in the generic catalog.** `src/catalog/Catalog.tsx:55` embeds “live ePA integration” directly in the shared catalog notice. `AGENTS.md` and ADR-0002 assign protocol-specific content to mission definitions and require a protocol-neutral shell, including the catalog. The reusable workspace satisfies that boundary, but the catalog notice does not fully follow it. Replace that phrase with “live protocol integration,” or supply the specific statement through mission content. This is a copy/boundary issue, not evidence of an operational ePA capability.

**SUGGESTION:** None.

### Full-change archive blockers — outside the requested slice

The OpenSpec task tracker still has 23 incomplete tasks. Under whole-change verification these are critical task-completion findings; they are not regressions in the authorized UI slice. Each task must be completed and supported by evidence before the whole change can be considered complete. Obtain the applicable owner approvals before executing the gated implementation tasks; this verification request supplies no such approval. Do not mark them done based on UI fixture results.

All references below are in `openspec/changes/001-oidc-pkce/tasks.md`.

| Task ID / line | Pending task                                                                                |
| -------------- | ------------------------------------------------------------------------------------------- |
| 6 / 19         | Review Catalog design: layout, availability, CTA states and accessibility.                  |
| 7 / 20         | Review Workspace design: canvas, mission panel, timeline and inspector.                     |
| 8 / 21         | Refine and approve high-fidelity visuals and state-specific mockups.                        |
| 9 / 22         | Validate shell reuse with OAuth and conceptual ePA fixtures for the broader change.         |
| 10 / 23        | Decide standalone repository versus `epa-auth-lab` integration for the broader change.      |
| 11 / 24        | Approve ADR-0001 and ADR-0002.                                                              |
| 12 / 25        | Approve OpenSpec scenarios and architecture event contract.                                 |
| 13 / 26        | Record explicit owner authorization for broader implementation.                             |
| 14 / 30        | Create only packages/apps required by the approved real vertical slice.                     |
| 15 / 31        | Configure a testable pinned Keycloak environment and demo realm.                            |
| 16 / 32        | Implement confidential BFF OIDC Authorization Code + PKCE and app session.                  |
| 17 / 33        | Complete mission registry/content and catalog/workspace integration for the broader change. |
| 18 / 34        | Implement independent demo Resource Server authorization.                                   |
| 19 / 35        | Add typed safe real-event projection and inspector integration.                             |
| 20 / 36        | Connect UX to actual observable outcomes and safe recovery flows.                           |
| 21 / 40        | Verify the real Keycloak flow from a clean checkout.                                        |
| 22 / 41        | Verify state/PKCE/OIDC callback errors do not create sessions.                              |
| 23 / 42        | Verify anonymous, wrong-audience and missing-permission resource requests fail.             |
| 24 / 43        | Test cookie/session and CSRF defenses.                                                      |
| 25 / 44        | Verify sign-out invalidates the application session.                                        |
| 26 / 45        | Verify no secrets or credentials in real traces, browser storage or routine logs.           |
| 27 / 46        | Pass the full execution UX and accessibility state checklist.                               |
| 28 / 47        | Mark the broader change VERIFIED only with documented real-flow evidence.                   |

### Assessment and verification limits

**UI Slice 001: no critical findings; one warning; zero suggestions.** Functional scenarios pass, with W1 remaining as a design-coherence correction. **The full change is not ready to archive**: 23 tasks remain incomplete, and real-execution Spec Coverage, Requirement Implementation Mapping, Scenario Coverage and runtime Design Adherence were not verified because the owner requested the UI slice only. Existing backend code is not accepted as an implementation of these draft scenarios by this report.

Screen-reader behavior, other browser engines, actual browser zoom, deployed routing fallback and owner visual sign-off remain unverified as already documented. Automated axe results do not establish full accessibility conformance. No implementation fixes, formal approvals, status promotion, spec synchronization or archiving were performed.

## Implementation follow-up — W1 resolved

Date: 2026-10-17. The owner requested continued implementation after the verification above. Within the existing UI Slice 001 authorization, `src/catalog/Catalog.tsx` now says “live protocol integration” in the shared notice. Mission-specific ePA wording remains in the mission definition and card content. This resolves W1 without changing the catalog's behavior, availability or navigation.

The previous verification section is a historical record of the finding before this correction. Current UI finding status: **zero open critical findings, warnings or suggestions from that review**. Formal approval of the broader change, its ADRs and the real OAuth/backend implementation remains pending. The existing five UI tasks remain complete; no broader task is marked complete by this correction.

Follow-up validation: strict TypeScript and production build passed; the existing catalog navigation/browser scenario passed; package formatting and strict OpenSpec validation passed. No new tests were added for this copy-only correction.
