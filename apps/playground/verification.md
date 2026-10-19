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

## Approved catalog asset integration — 2026-10-19

The owner's focused asset-integration request replaces generated decorative catalog artwork with the existing approved JPEGs. All six source images and both reference PNGs were visually inspected. This is an artwork substitution in the existing two-mission catalog; it adds no missions, dependencies, backend work or architectural framework. The deferred localization copy review remains deferred and no wording was changed.

### Assets and placement

Original filenames/formats are preserved in `public/assets/`. SHA-256 comparisons confirm all six public and production-build copies are byte-identical to `docs/design/assets/`; originals remain unchanged.

| Filename                        | Source dimensions / ratio           | Placement                                                                                |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `oauth-card-header.jpg`         | 800 × 400 / 2:1                     | OAuth/OIDC card; cyan identity shield/server artwork                                     |
| `epa-card-header.jpg`           | 800 × 400 / 2:1                     | ePA card; magenta medical-folder artwork                                                 |
| `mission-catalog-hero-wide.jpg` | 2172 × 724 / 3:1                    | Wide Earth-horizon hero above 760px                                                      |
| `mission-catalog-hero.jpg`      | 1672 × 941 / approximately 1.7768:1 | Alternative Earth/network hero at 760px and below                                        |
| `openid-card-header.jpg`        | 800 × 400 / 2:1                     | Copied and browser-decoded; no matching registered OpenID credential mission/card exists |
| `saml.jpg`                      | 800 × 400 / 2:1                     | Copied and browser-decoded; no matching registered SAML mission/card exists              |

The OpenID asset depicts a mobile credential/verification concept, matching the reference's OpenID4VCI / SD-JWT card. It is not substituted for the existing OAuth/OIDC-login preview. No placeholder mission entries were invented to display OpenID or SAML images.

### Changes

- `src/features/mission/ui/Catalog.tsx`: one local artwork-path mapping, responsive hero `<picture>` and decorative card `<img>` elements. Hero uses full-composition `contain` with bottom/right positioning; centered card `cover` crops decorative edges within the existing 180px frame while retaining shield/folder focal points. Image dimensions are explicit and all image alt text is empty inside existing decorative artwork regions.
- `src/styles.css`: replace generated-art styling with image fitting and readability overlays. The existing narrow layout gets a stronger dark overlay behind copy. Card dimensions, hover/focus styling, typography, layout, status badges, localization and preview links remain.
- Removed the inline SVG globe/network hero, `MissionArtwork`'s procedural SVG card illustrations and their radial-gradient/glow styling. No base64 image literals were present. Functional sequence diagrams, arrowheads, lifelines, interactive actor/event highlighting and icons were untouched.
- Updated `docs/design/visual-references.md` with the inspected inventory and `mission-catalog.md` with current asset usage, preserving earlier verification history.

### Validation and rendered comparison

- TypeScript and production build passed. The existing full suite passed **36/36 tests** (35.8s), including architecture, localization, browser interactions, accessibility and sequence geometry.
- After the final narrow readability-overlay adjustment, the build passed again and all **8 bilingual responsive/accessibility cases** passed (17.6s). No test expectations were weakened or new dependencies introduced.
- Package formatting and strict OpenSpec validation of `mission-control-design-foundation` passed.
- Dedicated asset verification loaded/decoded all six URLs from the built app, checked active responsive hero sources and decorative alternatives, and found **zero broken/HTTP-error asset requests**. Five obsolete-image requests were cancelled with `net::ERR_ABORTED` while the same browser resized between responsive sources; the selected images and every original URL subsequently decoded successfully. These cancellations are distinct from failed asset loading.
- **10 before and 14 after screenshots:** German and English at 1366, 1024, 760, 390 and 320 CSS px; after captures additionally cover actual native Chrome 100%/200% zoom. Installed Chrome 155.0.8059.84 zoom was set/read back through browser settings in an isolated profile, not emulated by viewport scaling.
- Across all **10 matched viewport/locale comparisons**, hero, card and image-frame positions/sizes are unchanged. Card heights were also stable before/after image decoding. No page overflow was detected. The final catalog contains image artwork and no remaining decorative SVG illustration placeholders.
- Visual inspection confirms the approved horizon/planet composition and cyan/magenta mission artwork replace the generated equivalents. Hero images retain their proportions without cropping; readable text stays above the dark overlay. Card central subjects remain recognizable at desktop and narrow sizes. Existing Mission Control interaction tests continue to pass.

Evidence is under `.cache/asset-integration/`: `asset-hashes.json`, `layout-comparison.json`, `after/loaded-assets.json`, and before/after `evidence.json`. The local verification helper owns and closes its preview/browser processes.

| Screen                   | Before                                                      | After                                                                                                                              |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Desktop catalog, German  | [Before](.cache/asset-integration/before/de-width-1366.png) | [After](.cache/asset-integration/after/de-width-1366.png)                                                                          |
| Narrow catalog, German   | [Before](.cache/asset-integration/before/de-width-390.png)  | [After](.cache/asset-integration/after/de-width-390.png)                                                                           |
| Narrow catalog, English  | [Before](.cache/asset-integration/before/en-width-320.png)  | [After](.cache/asset-integration/after/en-width-320.png)                                                                           |
| Actual 200% browser zoom | —                                                           | [German](.cache/asset-integration/after/de-native-zoom-200.png) / [English](.cache/asset-integration/after/en-native-zoom-200.png) |

No asset-integration defects remain in the checked matrix. OpenID credential/SAML rendering awaits matching mission definitions; their images are copied and verified, with current mission availability/navigation unchanged.

### Full-width hero correction — 2026-10-19

The owner subsequently requested that the hero expand to the full viewport width, showing a 3304px-wide browser capture. The catalog background now fills the viewport independently of its 1208px centered content column. Hero imagery uses proportional `cover` fitting with centered desktop horizon framing and right-centered narrow framing. The caption, headings, cards and supporting sections retain their established content alignment. This supersedes the initial contained/full-composition hero treatment above; the original images, card rendering and all behavior remain unchanged.

Verified German and English at 3304, 2560, 1920, 1366, 1024, 760, 390 and 320px: **16/16 geometry checks** confirm both hero edges meet the content viewport edges, headings align with cards, the content column retains its expected centered position, and no page overflow occurs. Images decoded successfully. Screenshots and geometry are under `.cache/asset-integration/full-width/`, including [the 3304px view](.cache/asset-integration/full-width/de-3304.png), [1366px](.cache/asset-integration/full-width/de-1366.png) and [390px](.cache/asset-integration/full-width/de-390.png).

Production build/TypeScript and package formatting passed. The existing eight bilingual responsive/accessibility cases passed again after this correction. No new dependencies or permanent tests were needed for this CSS-only adjustment.
