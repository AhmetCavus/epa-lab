# Mission Control v2 — visual reference contract

These five images are the approved visual direction for Auth Protocol Playground.
Source: user-provided original dark-navy screenshot plus four AI-generated mockups selected in chat on 2026-11-16.

## Priority order

1. **00-current-navy-baseline.png** establishes existing Yappai/Playground branding, dark navy palette, cyan/blue accents and application identity. **Do not switch to a light theme.**
2. **01-explore.png** is the target for the main mission experience: visible current state, primary action, understandable three-stage journey, contextual summary. The Resource Explorer may appear below the main journey.
3. **02-inspect.png** is the separate developer analysis view: event list and one selected event detail, safely scoped metadata; avoid long walls of repeated cards.
4. **03-animated-flow.png** is the target for the animated workflow: compact actors/flow, one highlighted observed step, transport controls, an explanatory event summary.
5. **04-resource-explorer.png** is the authenticated protected FHIR read experience with resource type, ID field and response.

## Non-negotiable behavior and security fidelity

- The mockups are **layout/style references**, not literal fixtures or API truth. Do not hardcode illustrated users, event counts, timestamps, claims, token lifetimes, response durations, JSON payloads, or protocol results.
- Do not expose tokens, code, state, PKCE verifier, secrets, unredacted cookies, raw authentication headers, or provider-internal claims in the browser UI. The Inspect mockup contains illustrative pseudo-values that must be replaced by safe, already-validated evidence DTOs.
- Never claim a Keycloak internal action was observed unless the system actually observed it; mark conceptual stages separately. Replay/animation must not fire OAuth transactions, perform fake network calls, or invent observations.
- The Resource Explorer is **unavailable when anonymous or expired**. Treat disabled controls as UX only; enforce session authorization in the BFF and access-token/audience/scope checks independently in HAPI.
- The CURRENTLY verified server permission is the exact synthetic `Basic/playground-demo` read. Do not enable `Patient`, `Observation`, arbitrary IDs, generic FHIR URLs or arbitrary FHIR proxying just because they appear in visual concepts. Additional resource types/IDs require explicit allowlist, synthetic fixtures, scoped backend endpoint and real security/negative tests.
- Keep existing OAuth/OIDC+PKCE flows, ePA/PAR behavior, same-origin cookies, logout and bounded event storage; no protocol or trust-boundary rewrite.
- Include empty, loading, success, authentication-expired, authorized denial, not-found and throttled/error states with truthful language.

## Visual implementation acceptance

- Recreate composition, spacing relationships, header/sidebar continuity, card hierarchy, main CTA placement, typography scale, dark surfaces and blue/cyan emphasis to match the images closely on desktop.
- Build responsive counterparts for 390/320 CSS px and accessibility zoom 200%, avoiding forced horizontal page overflow (internally scrollable technical code only when justified).
- Keep keyboard/focus/contrast accessibility and respect prefers-reduced-motion (instant static state, no forced animation).
- Real event playback derives from recorded events, with explicit observer/reporter semantics; animation timing is presentation only and can be paused/scrubbed.
- Use the existing React application and its design/component system; no separate frontend or large refactor. Keep both German (default) and English translations aligned.
- Preserve both public mission entry and functioning real authentication; use visual snapshot tests and compare screenshot output against these named references.

## Expected workflow

1. Place this directory under `docs/design/mission-control-v2/` in the project repository.
2. Create a **new scoped OpenSpec change** for the UX redesign and typed resource access.
3. Reference **all five exact file paths** in proposal/design/specs/tasks and acceptance.
4. Plan/propose first; implement only after owner approval, keeping live deployment unchanged until separate release approval.
