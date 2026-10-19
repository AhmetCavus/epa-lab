# Auth Protocol Playground

> **Project state:** **UI Slice 001 authorized**; authentication/backend changes remain DRAFT. The fixture-only browser app is isolated in [`apps/playground`](apps/playground/README.md), alongside the existing `epa-auth-lab` backend and infrastructure.

Run the UI from this repository root with `npm --prefix apps/playground ci` and `npm --prefix apps/playground run dev`, then open <http://127.0.0.1:5173/missions>. Root pnpm commands continue to target the existing backend. See the [UI package guide](apps/playground/README.md) for build and browser checks.

**Explore protocols. Execute flows. Understand security.**

A browser-only learning playground with a **Mission Catalog** and reusable **Mission Control Workspace**. Each mission explains a protocol through its actors, actions, safe observations, and contextual explanations. The first intended runnable mission is **OAuth 2.0 / OIDC Authorization Code + PKCE**; ePA/gematik and other families are future modules, not implemented capabilities.

## Decisions already made in discussion

- **Product form:** browser-only web application; no Electron, mobile app, or desktop distribution.
- **Primary UX:** Mission Control, reached through a Mission Catalog.
- **Extensibility:** the workspace is mission-agnostic, while protocol logic belongs to each mission.
- **Initial technical direction:** React + TypeScript SPA → NestJS BFF → Keycloak (AS and IdP roles); protected demo Resource Server for the OAuth learning journey.
- **Development discipline:** implement the explicitly authorized UI-only slice first; real authentication and backend implementation require their own approved specifications.

These decisions constrain the draft; the detailed UI, contract, and ADRs remain subject to design review.

## Read in this order

1. [`docs/product/vision-and-scope.md`](docs/product/vision-and-scope.md) — who the product serves, scope and outcomes.
2. [`docs/design/mission-catalog.md`](docs/design/mission-catalog.md) — catalog design and availability rules.
3. [`docs/design/mission-workspace.md`](docs/design/mission-workspace.md) — generic mission experience, inspector and timeline.
   - [`docs/design/visual-references.md`](docs/design/visual-references.md) — **view both embedded PNG designs before implementing UI**.
4. [`docs/design/visual-system.md`](docs/design/visual-system.md) — style decisions to review.
5. [`docs/architecture/system-context.md`](docs/architecture/system-context.md) — roles, trust boundaries and sequence.
6. [`docs/design/review-checklist.md`](docs/design/review-checklist.md) — sign-off checklist.
7. [`openspec/changes/001-oidc-pkce/proposal.md`](openspec/changes/001-oidc-pkce/proposal.md) — proposed first implementable slice, **not approved**.

## Repository content (now)

```text
auth-protocol-playground/
├── README.md
├── AGENTS.md
├── docs/
│   ├── product/
│   │   └── vision-and-scope.md
│   ├── design/
│   │   ├── mission-catalog.md
│   │   ├── mission-workspace.md
│   │   ├── visual-references.md
│   │   ├── visual-system.md
│   │   ├── review-checklist.md
│   │   ├── fixtures/
│   │   │   ├── oauth-oidc.md
│   │   │   └── epa-concept.md
│   │   └── assets/                 # exploratory artwork, not final UI spec
│   └── architecture/
│       ├── system-context.md
│       └── decisions/
│           ├── ADR-0001-spa-bff-keycloak.md
│           └── ADR-0002-mission-boundaries.md
└── openspec/
    ├── project.md
    └── changes/
        └── 001-oidc-pkce/
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                ├── mission-experience/spec.md
                └── authorization-flow/spec.md
```

The tree above describes the design handoff. This checkout also contains existing `services/epa-authorization`, `infrastructure/`, root tooling, an Android placeholder, and the isolated `apps/playground` UI. Slice 001 uses no backend integration and preserves those existing components.

## Status and authority

Architecture and OAuth documents remain `DRAFT` unless otherwise noted. The UI-only first slice is authorized by the owner. In this project:

`DRAFT → REVIEWED → APPROVED → IMPLEMENTED → VERIFIED`

- Discussion is for decisions and design critique.
- Files in this repository are the implementation handoff source of truth.
- A mission is only marked **Available** after its end-to-end path has been verified.
- Design images are **exploratory**; textual requirements and approved decisions take precedence if they conflict.

## Integration note

The design handoff originated as a standalone starter. Repository inspection confirmed it now coexists with existing `epa-auth-lab` code. Slice 001 is an isolated UI package in `apps/playground`; existing services, configuration and infrastructure are preserved. Future backend integration and deployment remain open decisions requiring explicit approval.

## UI Slice 001

The catalog and fixture-driven mission-agnostic workspace are implemented in [`apps/playground`](apps/playground/README.md). Review both previews and the [verification record](apps/playground/verification.md) against the [visual references](docs/design/visual-references.md). Real authentication and backend implementation remain DRAFT and require separate approval.
