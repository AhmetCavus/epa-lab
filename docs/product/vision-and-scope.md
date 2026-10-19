# Product Vision & Scope

**Status:** DRAFT · **Version:** 0.1 · **Date:** 2026-10-16

## Vision

Make authentication and authorization protocols understandable by executing real flows where available, visualizing role interactions, and inspecting **safe, honest evidence** with clear explanations.

## Intended users

Primary: software developers and architects who need to understand protocols and security boundaries; secondary: readers evaluating technical demonstrations and educational content.

## Product model

- **Mission Catalog:** choose a learning journey; see genuinely available vs planned missions.
- **Mission Control Workspace:** common interaction design for the selected mission.
- **Mission Definition:** protocol-specific objectives, actors, educational steps, user actions and explanatory text.
- **Mission Execution Capability:** protocol-specific operations; may require backend APIs or external providers.
- **Run:** an execution instance. Viewing an existing run is different from executing a new protocol transaction.

## First deliverable

The owner authorized **UI Slice 001** as a fixture-only precursor: Catalog and a shared Workspace with OAuth sample explanations and a conceptual ePA layout preview. It lives in isolated `apps/playground` alongside existing repository services. It offers no real protocol execution and does not fulfill or approve the end-to-end deliverable below.

A polished catalog and reusable workspace hosting one genuine end-to-end OAuth/OIDC Authorization Code + PKCE journey. The flow covers Keycloak login, BFF session, safe event inspection, and authorization to access a synthetic protected API resource. A conceptual ePA fixture must also fit the **design** of the workspace, without implementing ePA integration.

## Out of scope for v1

- Native mobile/desktop clients; own login/password form; new authorization server or IdP.
- Real gematik/TI/ePA/VAU connectivity, patient data, certification or regulatory compliance claims.
- Production public multi-tenant deployment, self-service user management, analytics, badges/leaderboards, AI tutor.
- Arbitrary protocol scripting, installable mission marketplace or runtime plugin engine.
- PAR and full security-experiment suite until later approved changes.

## Learning outcomes for first mission

A learner can explain: Resource Owner vs Browser vs OAuth Client; Authorization Server vs IdP; front and back channel; Authorization Code/PKCE; purpose of an ID Token vs Access Token; how a Resource Server decides to allow a request; and the difference between observed evidence and interpretation.

## Quality principles

1. **UX-first:** UI design and interaction states are approved before application code.
2. **Mission-agnostic shell:** no OAuth-specific implementation assumptions in reusable screen components.
3. **Truthful telemetry:** provider internals are not falsely presented as observed BFF events.
4. **Secure defaults:** no sensitive tokens or protocol secrets in the frontend inspector.
5. **Real execution:** basic OAuth flow must use actual Keycloak, not merely a scripted animation.
6. **Accessible:** keyboard operability, focus visibility, contrast, reduced motion; target WCAG 2.2 AA.
7. **Capability first:** new infrastructure only when justified by an approved scenario.

## Decisions requiring review

- Product language for first release: English (proposed).
- Local-only runnable deployment for first verified slice (proposed); public interactive hosting requires separate hardening review.
- Initial catalog: OAuth/OIDC (availability pending verification) and ePA/gematik (planned). Other mission families are conceptual only.
- One integrated learning workspace rather than a separate gamification engine.
- Standalone repository vs coexistence with `epa-auth-lab` (unresolved).
