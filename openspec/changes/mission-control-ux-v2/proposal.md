# Proposal

## Why

Authentication works, but the current long sequence canvas and scattered controls obscure what succeeded and what the learner should do next. The approved Mission Control v2 references define a clearer navy Explore experience, a separate developer Inspect view, recorded-event playback and a bounded Resource Explorer.

**Status: APPROVED for isolated implementation, 2026-11-16.** The owner explicitly authorized all 26 tasks in order on `feat/mission-control-v2`, including rendered visual comparison and isolated functional/security/accessibility verification. No public deployment, production infrastructure change or archive is authorized.

Isolated implementation and verification completed 2026-11-17; see the
[acceptance matrix](acceptance-matrix.md). This does not authorize public release.

## What Changes

- Replace the OAuth workspace presentation with distinct Explore and Inspect modes, preserving the mission route, current run, event ownership and German-default/English localization.
- Make Explore the default: mission objectives, three understandable stages, prominent truthful authentication status, a concise explanation and one dominant next action. Handle anonymous, restoring/loading, authenticated, expired, failed and logged-out states.
- Give Inspect a compact left timeline, central selected-event details and right contextual metadata. Reuse validated version-1 event DTOs; separate observed evidence, reported resource decisions and conceptual explanations.
- Add compact, accessible Browser/BFF/Keycloak/Resource Server playback of recorded events. Playback never executes authentication or resource calls, and reconstructs the explanation after the external login redirect.
- Enable the Resource Explorer form immediately after successful authentication or authoritative session restoration. Extend the existing resource operation with bounded type/ID selectors, the server allowlist and a safe synthetic FHIR JSON projection. Initially permit only `GET Basic/playground-demo`; preserve the existing no-parameter resource API. Fetch validates the owning session and selection in the BFF, then HAPI independently validates JWT and authorization. Explain actual 200/401/403/404 outcomes without a preliminary read, eligibility store or resource-catalog endpoint.
- Require rendered visual comparisons against every target, preserving the navy baseline. Correct illustrative protocol text, identities and technical values; do not reproduce screenshot data as runtime evidence.

The authoritative visual set, all inspected for this proposal, is:

- [docs/design/mission-control-v2/00-current-navy-baseline.png](../../../docs/design/mission-control-v2/00-current-navy-baseline.png)
- [docs/design/mission-control-v2/01-explore.png](../../../docs/design/mission-control-v2/01-explore.png)
- [docs/design/mission-control-v2/02-inspect.png](../../../docs/design/mission-control-v2/02-inspect.png)
- [docs/design/mission-control-v2/03-animated-flow.png](../../../docs/design/mission-control-v2/03-animated-flow.png)
- [docs/design/mission-control-v2/04-resource-explorer.png](../../../docs/design/mission-control-v2/04-resource-explorer.png)

The [reference contract](../../../docs/design/mission-control-v2/README.md) governs layout fidelity and security corrections.

## Capabilities

### New Capabilities

- `mission-experience`: V2 Explore/Inspect composition, state-driven actions, safe inspection, visual acceptance and accessible localized navigation. Reuses the capability name in the unarchived `001-oidc-pkce` change.
- `recorded-flow-playback`: Evidence-derived actor highlighting, progress and presentation-only playback with honest provenance.
- `synthetic-resource-explorer`: Session-enabled resource selection, bounded FHIR presentation and independently enforced per-request authorization and denial behavior.

### Modified Capabilities

None in the published spec inventory: `openspec list --specs` currently returns no specs. The design explicitly reconciles the earlier unarchived Mission Control layout requirements; it does not duplicate or change their OAuth/security contracts. No existing change is archived or edited by this proposal.

## Impact

Implementation is limited to the existing React capability structure, localization/styles/tests and the NestJS standard-resource boundary. Reuse the existing resource route and proxy allowances; this single-entry version needs no resource-catalog endpoint. Reuse Keycloak, secured HAPI, versioned observations, session/logout handling, bounded storage and current rate limits; no new runtime dependency or framework is planned.

OAuth/OIDC/PKCE, provider configuration, token handling, ePA/PAR, HAPI policies/data and unrelated infrastructure stay outside the redesign. Additional resource types/IDs, arbitrary URLs, caller-selected tokens, raw HTTP inspection, patient data and new applications/services/databases are excluded. Deployment requires a later explicit release instruction.


The isolated implementation and its evidence are recorded in the
[nine-area acceptance matrix](acceptance-matrix.md) and
[implementation verification](implementation-verification.md). Public deployment remains unchanged.
