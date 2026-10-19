# Agent Guidelines — Auth Protocol Playground

**Current authorization:** the owner has authorized **UI Slice 001 only** (Mission Catalog + mission-agnostic Workspace using clearly labeled fixture events). This is a narrow exception to the earlier design-only gate. The existing OIDC/PKCE OpenSpec change remains `DRAFT`: **do not implement real authentication, NestJS, Keycloak, protected APIs, or infrastructure** until those specs are approved.

The owner additionally authorized `capability-first-arch-refactoring` through an explicit apply request. This permits structural frontend changes that preserve the existing fixture-only behavior and visuals; it does not authorize Slice 002 or backend integration.

The owner authorized `localization-foundation` and adoption of ADR-0004 through an explicit apply request on 2026-10-19. This permits German-default/English frontend localization only; all backend/Slice 002 gates remain in force.

The owner authorized deployment of the existing fixture-only `apps/playground` at `auth-playground.yappai.de` and registration as a Yoster hosted project on 2026-10-19. This permits its static Nginx container, dedicated Compose stack and Traefik routing. It does not authorize backend/OAuth integration or exposure of the existing authorization service or Keycloak.

## Project conventions

- All Codex prompts and technical documentation are in English. Current frontend copy supports German (default/fallback) and English per ADR-0004.
- Respect decisions established by the user: browser SPA, NestJS BFF, Keycloak, mission-agnostic catalog and workspace.
- Keep the generic shell unaware of OAuth/ePA nouns, step counts, or specific validation behaviors.
- Mission declarations may be statically registered; do not propose dynamic plugins, universal protocol DSLs, microfrontends or a generic gamification engine without a demonstrated requirement.
- **UI design is part of the contract:** open `docs/design/visual-references.md` and inspect both PNGs in `docs/design/assets/` before any UI implementation. Reuse their layout hierarchy, dark visual language, and interaction emphasis; never treat decorative or protocol-inaccurate mockup elements as functional requirements.
- Design alongside functional specs, not as post-implementation styling. Before a feature is built: UX state + observable scenario + architecture boundary + verification approach must align.
- Do not redefine OAuth roles: Resource Owner/User, Client, Authorization Server and Resource Server are OAuth 2.0 roles; the Identity Provider is an OIDC/federation concept. Here the **BFF** is the OAuth client; SPA is UI/browser user agent; Keycloak implements the AS and IdP roles.
- Browser traffic and direct BFF-to-AS communication are distinct channels. Never label an explanatory inferred/provider-side step as an observed trace.
- Security: no browser-exposed bearer tokens, passwords, authorization codes, PKCE verifiers, client secrets, raw callbacks, cookies or entire HTTP bodies in the learning inspector or routine logs.
- No real patient data, live TI claims, or gematik certification claims.

## Frontend architecture

Follow [ADR-0003](docs/architecture/decisions/ADR-0003-capability-first-code-organization.md) in `apps/playground`:

- Organize code by capability, then responsibility: `ui`, `application`, `domain`, `data`. Create only layers with real implementation; do not add a separate `model` layer.
- UI consumes application behavior and domain contracts. Keep rendering, browser layout and small visual state in UI; keep use-case coordination in application hooks. Application may use its data modules directly.
- Domain contracts are canonical and independent of React, browser APIs, network clients and persistence. Data modules depend on domain contracts and contain no rendering logic.
- Mission owns catalog/definitions/registration/checkpoints. Protocol-flow owns neutral actors/events/selection/diagram/timeline/Inspector and must not import mission or protocol-specific implementations.
- Cross-capability imports use explicit public entries: mission `index.ts`; protocol-flow `contracts.ts` for types, `selection.ts` for application coordination and `index.ts` for UI. Internal modules import their owning modules directly; domains/application must not import a UI barrel. Avoid cycles, including type-only/re-export edges.
- Keep static registration simple. Add shared code only for demonstrated reuse; omit unused layers and speculative repositories, factories, service/controller classes, dependency injection or plugin frameworks.
- Run the focused architecture tests alongside existing browser/accessibility checks when changing imports or ownership. Structural refactors preserve stylesheet/asset contents and observable behavior.

## Localization

Follow Accepted [ADR-0004](docs/architecture/decisions/ADR-0004-localization-and-i18n.md):

- German (`de`) is the default/fallback independent of browser language; English (`en`) is supported. Persist only explicit language choice under `auth-protocol-playground.locale`, with guarded storage access.
- Keep user-facing copy in UTF-8 `src/locales/{de,en}/{common,mission,protocol-flow}.json`, using semantic keys, interpolation and plural forms. Add matching entries in both languages and run localization resource checks.
- Initialize i18next once in `app/i18n.ts` before rendering. Only composition imports resource JSON/i18next; feature UI may use `react-i18next`. Features must not import app initialization. Domain/data/application must not import localization runtimes or dictionaries.
- Domain/data carry neutral content references and stable classifications/IDs; UI resolves text. Never translate technical evidence values, protocol literals or identifiers. Preserve fixture/conceptual/not-observable annotations in both languages.
- Store workspace identity and notification intent rather than translated display text. Language changes must not reset navigation, mission/checkpoint/selection, loaded fixtures or map scale.
- Preserve keyboard/accessibility behavior and design. Verify both languages at narrow widths and actual browser zoom; retain diagram-local scrolling instead of shrinking translated text.

## Decision and change discipline

1. Read `README.md`, `docs/product/vision-and-scope.md`, both UX documents, and architecture ADRs before proposing modifications.
2. When details are unknown, write an **Open Decision** in the relevant file; do not silently invent the answer.
3. Update architecture, UX, and OpenSpec consistently when a decision changes.
4. Implement the currently authorized **UI Slice 001** from the design docs only. Any additional OpenSpec change requires explicit `APPROVED` status and acceptance conditions; UI approval is not authorization for OAuth integration.
5. Prefer a complete small vertical slice over creating infrastructure for many future missions.
6. Never edit existing `epa-auth-lab` code or configuration based on assumptions; first verify the chosen repository boundary.

## Definition of Ready for OAuth/backend implementation

- Product scope and first mission outcomes approved.
- Catalog + Workspace interaction model and high-fidelity visuals reviewed.
- A conceptual ePA fixture fits the generic Workspace without changing generic controls or copy.
- SPA/BFF/Keycloak boundaries, resource authorization and event provenance agreed.
- Successful and negative Given/When/Then acceptance cases approved.
- Owner explicitly authorizes implementation.
