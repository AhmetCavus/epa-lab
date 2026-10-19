# Design

## Context

See `proposal.md` for motivation and `specs/localization/spec.md` for the behavior contract. The owner's explicit apply request on 2026-10-19 approves this frontend plan and adoption of ADR-0004; backend/authentication gates remain unchanged.

The inspected frontend already follows Accepted ADR-0003: `app` composes routing; mission owns the catalog, static registry and workspace coordination; protocol-flow owns neutral selection, visualization, timeline and Inspector. Canonical domain contracts are framework independent. There is no localization dependency or shared-code directory today.

Current migration points are concrete:

- `App`, `Catalog`, `Workspace`, `NotFound`, `ActorCanvas`, `InteractionPaths`, `Timeline` and `Inspector` contain visible and accessible English copy. Route title effects and `index.html` are English.
- `features/mission/data/oauth.ts` and `epa.ts` contain mission/actor/group/checkpoint prose. OAuth includes four educational events and an allowlisted evidence projection. Some evidence values are technical (`code`, `S256`, `BFF`, `Access Token`); others are human descriptions (`Back channel`, `Synthetic only`).
- `useMissionWorkspace` stores announcements as translated English sentences. Its checkpoint ID/loading flag and `useProtocolSelection`'s single selection identity must survive locale changes. `Workspace` separately owns map scale/scroll refs; `WorkspaceRoute` intentionally keys it by mission ID.
- The existing architecture checker allows only the current capability/public-entry graph and only React as a protocol-flow external dependency. Browser checks use English accessible names; one test requires entirely empty local/session storage and cookies. The long-label test server-renders the real canvas without a localization provider.
- Product scope still lists English as the proposed first-release language. Existing UX availability/action labels are English examples, not stable programmatic identifiers. Reconcile these during approved implementation rather than editing historical verification results.

## Goals / Non-Goals

**Goals:** add one composition-owned localization instance; resolve copy at presentation boundaries; preserve identity-based selection, protocol semantics and existing visual hierarchy; make resources and their consumers verifiable with installed tooling.

**Non-Goals:** browser-language detection, backend localization/errors not currently present, translated URL paths, mission persistence, cross-tab synchronization, remote resources, per-mission initialization, a custom translation engine, generalized content authoring, new shared layers, authentication or Slice 002.

## Decisions

### 1. Initialize once, before rendering

Add `app/i18n.ts`, imported/initialized from `main.tsx` before rendering the existing router. Use `i18next` with `react-i18next`; no library exists to reuse. Bundle both languages and all three namespaces statically, with `de` as initial/default fallback, an explicit supported-language allowlist and no language detector or remote loader. This avoids resource-fetch loading states and an initial English flash on a German visit.

Read the single local-storage key `auth-protocol-playground.locale` once with guarded access. Accept exactly `de` or `en`; missing/invalid/unreadable values select `de`. Write only on explicit selection, with guarded failure. If storage is blocked, keep the active choice in the existing localization instance for the current page lifetime. Do not clear unrelated storage or add cookies/session persistence. A reload with unavailable storage correctly returns to German.

App owns the language control and calls the configured instance through the existing translation hook. Feature UI uses `react-i18next` directly for its namespace and content references; it never imports `app/i18n.ts`. Keep a single provider/instance around the existing route tree if an explicit provider is needed; never key it or routes by language. No shared facade/context/state store is necessary for these actual consumers.

Use a compact native select in the existing global header, with a translated visible label and autonym options `Deutsch` / `English` (each option can declare its language). Retain the native value, focus behavior and keyboard support. Style only this new control and any minimum wrapping adjustment required by longer text; retain the layout, color/type scale, artwork and animation direction. A custom popover/menu adds no value.

Set `<html lang>` on initialization and changes. Make Catalog/Workspace/NotFound title effects depend on the active translation function/language, using translated title templates and stable brand names. Set the static HTML language/default title to German and keep static description/default metadata consistent with the resource source of truth; avoid independently authored UI copy. Runtime screen titles and any updated description use resource keys.

### 2. Keep resource ownership simple

Create exactly six UTF-8 JSON files under `src/locales`:

| Namespace     | German / English paths                           | Content ownership                                                                                                                                     |
| ------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| common        | `de/common.json`, `en/common.json`               | Header/footer, navigation, language label, common actions/status, route recovery, document metadata                                                   |
| mission       | `de/mission.json`, `en/mission.json`             | Catalog/Workspace mission framing; both missions' metadata, actors/groups, checkpoints and mission-specific fixture explanations/evidence annotations |
| protocol-flow | `de/protocol-flow.json`, `en/protocol-flow.json` | Generic canvas/timeline/Inspector labels, channels, evidence/visibility labels, selection descriptions and accessible alternatives                    |

Mission-specific explanations belong under semantic mission subtrees such as `mission:definitions.oauthOidc.events.exchange.explanation`. Generic protocol-flow text uses keys such as `protocol-flow:inspector.channel.back`. The neutral renderer can resolve a fully qualified content key supplied by its caller without knowing which mission or protocol supplied it. Namespace ownership follows the text's meaning; no ePA namespace or protocol-specific conditional in generic UI is needed yet.

Move all current presentation copy, including aria labels, SVG accessible descriptions, keyboard help, counters, disabled states, empty states and action announcements. Decorative text displayed in artwork is still copy unless it is a retained technical/brand literal; decorative shapes stay excluded from the accessibility tree. Keep headings with styled spans as structured translated fragments using library-supported composition, not HTML stored in JSON. Avoid English word-order concatenation and runtime-generated keys assembled from translated labels.

Use interpolation for names/counts, plural entries where counts affect words, and locale-aware number formatting when numbers are presented. Fixed step IDs/technical example codes are not formatted as prose. No date or currency UI is invented. Interpolated values render as React text; do not use `dangerouslySetInnerHTML` for translations or data.

### 3. Separate content references from protocol values

Update the existing canonical contracts in place; do not add a parallel localized domain model, duplicate mission registry or cache language-specific fixture events. Human-text fields become explicit language-neutral content-key references (for example `titleKey`, `descriptionKey`, `explanationKey`, `labelKey`). Plain string references do not import i18next, React, JSON dictionaries or browser APIs into domain/data. Resolve those keys in consuming UI, including the scalar context inputs passed to Inspector.

Preserve mission/actor/group/checkpoint/event IDs, actor IDs on messages, channel kinds, event kinds, order and groups. Replace presentation-word discriminants such as availability `Fixture preview` / `Planned` and visibility `Explained` / `Not observable` with neutral semantic codes such as `fixture` / `planned` and `explained` / `not-observable`; translate their displayed labels in UI. This is a frontend-internal contract migration, not a change in evidence meaning or any external API. Internal events must still enforce the not-observable variant in the canonical union.

Evidence needs one small explicit distinction: retain the allowlisted projection, give field labels content keys, and distinguish a literal technical value from a translatable educational annotation using a discriminated value union in the existing protocol-flow contract. For example, `code` and `S256` remain literal values; the current synthetic-data description is a content reference. A translated channel description comes from the channel kind/content reference rather than pretending an English phrase is captured traffic. Never run arbitrary evidence strings through translation or derive translations by replacing substrings in protocol data.

Human-friendly actor labels/roles may translate where appropriate, while legitimate names and terms such as Keycloak, NestJS, OAuth, OIDC, PKCE, Resource Owner, Access Token and ID Token retain their technical meaning/spelling. Put presentation occurrences in resources where that keeps copy centralized; the allowlisted technical evidence stays literal. Endpoint paths, claim/parameter names, methods/statuses and future wire values are outside localization. No backend model/event ingestion adapter is added in this fixture-only scope.

This focused key-reference migration is preferable to creating a localized copy of every event whenever language changes: translated events in state would risk stale Inspector content and mix presentation with evidence. A generic renderer that branches on mission/event IDs would violate ADR-0003.

### 4. Store action intent, retain learning identity

Keep `useProtocolSelection` independent of localization. Its actor/event lookup and highlights remain based on stable IDs and event structure. Keep `WorkspaceRoute` keyed only by mission ID. Locale re-rendering must not call reset/load/replay or replace the active mission instance just to translate it.

In `useMissionWorkspace`, replace stored English announcements with a small semantic notification descriptor for the existing actions (load, replay, reset and UI Fit feedback), with parameters only when needed. It stores no translated result and does not call the translation runtime. UI resolves the descriptor in the active locale at the existing live region. Existing checkpoint/loading/inspection state and local map scale remain in their current owners. Recompute visible labels on language changes rather than storing strings or translated objects in state.

Retain Inspector's neutral `contextTitle` / `contextExplanation` presentation inputs: Workspace resolves the selected checkpoint keys before passing these scalars. Generic event/actor content is resolved from the neutral references already carried by its inputs; Inspector does not import mission definitions. Selection never becomes a language-dependent title comparison.

### 5. Enforce completeness without building a translation platform

Use the current Playwright runner for Node-side resource checks and browser scenarios; no separate test framework is required. Validate recursive leaf-key parity, nonblank values, namespace presence, interpolation-parameter agreement and required plural forms. Validate content references from both registered missions, their actors/checkpoints and fixture evidence; ensure generic UI references resolve too. Include a focused negative test proving unknown references fail, rather than assuming matching dictionaries catch a typo present in neither language.

Test fallback with an isolated configured test instance/resource copy missing one English entry; never delete a production dictionary entry to demonstrate fallback. German fallback preserves interpolation and does not change the selected language. Missing keys/namespaces surface in development/test diagnostics and fail verification, without logging evidence bodies or secrets. Runtime fallback is resilience, not acceptance of incomplete release resources.

Update the dependency checker narrowly: allow `main.tsx` to initialize app i18n; app initialization to import the six resource files and the two localization libraries; feature UI to consume `react-i18next`. Account for JSON imports and any narrowly scoped type declarations. Do not allow feature-to-app imports, feature runtime imports of resource JSON, localization imports in domain/data/application, or broad new external dependencies in protocol-flow. Preserve current public entries, cycle checks, canonical-contract checks and framework/browser-free domain compilation. Add negative-edge assertions for the new rules.

Adapt the server-rendered canvas layout test to an isolated localization provider/instance and content references; keep its reverse arrows, uneven groups, long-label wrapping and geometry assertions. Update English-name-based browser cases deliberately: retain English regression coverage through explicit language selection and add German-default coverage, rather than relying on test/browser locale. Replace the blanket localStorage-empty assertion with an exact preference allowlist, while keeping cookies/session storage empty and checking no mission/authentication data is stored.

### 6. Keep design and verification honest

Before implementation, inspect both original reference PNGs as required by AGENTS and capture the existing rendered catalog/workspaces. Retain existing screenshots and verification reports. After migration, compare English screens to the baseline allowing expected language-control/copy differences, and compare German screens for equivalent hierarchy, readability and functionality. Do not claim German screenshots should be pixel-identical to English.

Cover catalog, both empty workspaces, loaded fixtures, selected front/back/internal events, actor/checkpoint states, unknown-route recovery, replay/reset/Fit and keyboard switching. Check German/English at 1366, 1024, 390 and 320 CSS pixel widths, reduced motion and actual desktop browser zoom 100%/200%. Assert message/lifeline alignment and no text collisions in both languages; retain diagram-local horizontal scrolling and readable minimums. Run accessibility scans in both languages and inspect the live-region/document-language behavior. Record browser/version, dimensions, locale, actual zoom and capture paths. If native zoom cannot run, mark its manual acceptance item outstanding; resizing/device scale does not satisfy it.

## Risks / Trade-offs

- German labels are longer and the new header control uses space → natural wrapping and existing panel reflow; inspect both locales at narrow widths/actual zoom, without reducing type size or redesigning cards.
- Key references replace compile-time English strings → dictionary/reference checks, clear semantic keys and incremental TypeScript migration; no silent cast around invalid keys.
- Display-like evidence may be mistaken for wire data → explicit literal/annotation distinction, preserve the allowlist and compare technical values/classifications across languages.
- Locale changes could reset a keyed tree or stale translated state → one initialization point, stable mission key, ID-based selection and semantic notification state; browser assertions cover this directly.
- Storage failures could block startup → guarded read/write and in-memory active locale; no session/cookie substitute.
- Broadened dependency checks could weaken ADR-0003 → explicit allowed UI/composition edges with negative tests; keep domains and generic protocol logic runtime-independent.
- ADR-0004 conflicts with earlier proposed-English guidance → on approval, adopt the decision and update only current language guidance; preserve historical design/verification context and backend gates.

## Migration Plan

1. Confirm approval for this scoped change and adoption of ADR-0004; retain backend/Slice 002 exclusions. Establish working-tree/build/test and screenshot baselines without resetting user changes.
2. Add the two dependencies, resources and initialization; migrate neutral content references/evidence distinctions and their consumers incrementally. Preserve one registry and the existing public capability APIs.
3. Migrate presentation/announcements/document metadata, then add the accessible header control and guarded preference. Keep a runnable path through each increment; do not expose a partly translated release as complete.
4. Update resource, browser, architecture, accessibility and geometry tests. Reconcile ADR/product/UX/AGENTS/package documentation in the same approved change, keeping technical documentation English.
5. Run `npm --prefix apps/playground run typecheck`, `run build`, `test`, `run format:check` and `openspec validate localization-foundation --strict --json`. The current `test` script builds and runs Playwright, including Node-side architecture checks; no standalone unit-test script exists. Add localization checks there and record them distinctly.
6. Write `verification.md` for this change with changed modules/contracts, dependency versions, results, screenshots, translation review findings and any outstanding checks. Preserve earlier verification history; do not archive other changes or start OAuth work.

Rollback is limited to this change's initialization, dependencies, resources, content-reference migration and consumers together. Restore the prior English interface if needed; an inert saved locale entry is harmless. Do not delete unrelated user changes/storage or roll back earlier architecture/design work.
