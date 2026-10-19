# Agent Guidelines — Auth Protocol Playground

**Current authorization:** the owner has authorized **UI Slice 001 only** (Mission Catalog + mission-agnostic Workspace using clearly labeled fixture events). This is a narrow exception to the earlier design-only gate. The existing OIDC/PKCE OpenSpec change remains `DRAFT`: **do not implement real authentication, NestJS, Keycloak, protected APIs, or infrastructure** until those specs are approved.

The owner additionally authorized `capability-first-arch-refactoring` through an explicit apply request. This permits structural frontend changes that preserve the existing fixture-only behavior and visuals; it does not authorize Slice 002 or backend integration.

## Project conventions

- All Codex prompts and technical documentation are in English; content can be localized in future missions as explicitly specified.
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
