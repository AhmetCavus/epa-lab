# Tasks

**DRAFT — planning only.** All 22 tasks are unstarted. Apply requires a subsequent owner
instruction; implementation approval does not authorize public deployment. Follow
[design.md](design.md), [shell acceptance](specs/unified-application-shell/spec.md) and
[simulation acceptance](specs/protocol-simulations/spec.md). Preserve existing live services,
credentials, provider/HAPI policies, databases, volumes and historical evidence.

## 1. Shared application header

- [ ] 1.1 Extract the actual v2 header into one shared mission UI component, render it once through application composition and remove duplicated/hidden headers. Preserve the sidebar and capability/public-entry boundaries; verify one header/language selector on catalog and workspace routes with DOM and architecture checks.
- [ ] 1.2 Vendor the identified official Yappai icon unchanged and reuse live v2 header tokens, desktop geometry and contextual active navigation. Verify the source hash, local-only asset loading, aspect ratio and desktop comparison against the actual live reference; introduce no replacement artwork or dead navigation.
- [ ] 1.3 Complete shared-header DE/EN, responsive navigation, skip link and keyboard/focus behavior. Add focused locale/mobile/accessibility tests and document header ownership/reference precedence in the affected design notes; verify language and presentation navigation preserve current mission/view state.

## 2. Mission Catalog actions and layout

- [ ] 2.1 Extend mission-owned link/availability declarations for explicit simulation and existing runtime-gated live destinations. Test exact OAuth/ePA action URLs, retained mission IDs, disabled-runtime availability and the absence of an ePA live action without protocol execution.
- [ ] 2.2 Render OAuth primary Simulation starten / secondary Live-Demo starten and ePA primary Simulation starten with matching English copy. Preserve artwork/hero/card composition, aligned action regions and a 10px gap; verify both locales and responsive card screenshots/geometry.
- [ ] 2.3 Update introductory copy, availability badges and notices to describe actual simulation/live availability. Add catalog/action/localization regressions and reconcile only affected product/catalog UX text; verify no stale blanket no-live claim, changed artwork bytes or implicit login/resource call.

## 3. Simulation execution boundary

- [ ] 3.1 Resolve execution=simulation|live separately from mode/panel before controller mounting. Implement the design's full routing table, fixture-alias precedence, duplicate/invalid fail-closed handling and unchanged clean callback; verify direct links, navigation and back/forward with resolver/browser tests and runtime guards.
- [ ] 3.2 Add explicit neutral simulated event and resource-presentation variants without altering live wire decoders or constructing OAuth sessions. Typecheck and test simulated sequence/virtual time/outcome, safe allowlisted fields and rejection of cross-kind/unsafe data; preserve real observer/reporter semantics.
- [ ] 3.3 Separate local simulation and existing live controller lifecycles at the mission boundary. Verify zero simulation service reads/writes, no shared session/CSRF/history/result state, outgoing-work cancellation and rejection of held live responses after switching; keep explicit secure logout/cancellation unchanged.
- [ ] 3.4 Extend existing timeline/Inspector/filter/playback presentation for simulated provenance and mission-supplied progression callbacks while keeping live playback read-only. Test source/outcome/virtual-time labels and no duplicate events; document routing, mode-versus-view and mode-versus-logout behavior in the runtime guide.

## 4. OAuth/OIDC Simulation

- [ ] 4.1 Implement the small deterministic OAuth mission reducer and safe event/content definitions for the Code/S256 no-PAR journey, PKCE rejection and missing-resource-permission examples. Verify transition order, role/channel correctness, bounded attempts, invalid actions and non-usable protocol placeholders with focused state tests.
- [ ] 4.2 Connect explicit Start, paused initial progression, Play/Pause/Step, previous/replay and Reset simulation/restart to the reused v2 Explore/Inspect/Flow presentation. Test separate progression/selection, resource-action stopping, reduced motion, repeated actions, unmount/reset and stale-timer rejection.
- [ ] 4.3 Reuse the Explorer form/result views for the fixed local fictional Basic/playground-demo projection and simulated permission denial. Verify explicit-action gating, JSON/overview/metadata source labels, no invented HAPI measurements and zero API requests; simulated success must grant no live eligibility.
- [ ] 4.4 Complete OAuth simulation DE/EN explanations, status/failure announcements and learning-action documentation. Verify the full success/failure/reset journey with browser tests, including fixture-alias entry, Explore/Inspect selection preservation, keyboard controls and no credentials or live operations.

## 5. ePA/gematik Simulation

- [ ] 5.1 Implement the bounded ePA conceptual reducer/content using the existing actor and documented lab PAR model, with success and PAR-rejection examples. Verify deterministic transitions, service/IdP role distinctions, direct-PAR versus user-agent channels and no invented normative endpoint/VAU/clinical exchange.
- [ ] 5.2 Connect ePA progression, playback, inspection and conceptual protected-result framing to the same v2 presentation. Add matching DE/EN conceptual/simulated labels and test actor-local explanations, failure stops, restart and zero provider/BFF/FHIR/legacy requests; add no ePA live controls or patient/FHIR response fiction.
- [ ] 5.3 Update the affected ePA concept/UX documentation with source boundaries and non-conformance wording, preserving legacy implementation/history. Verify the full conceptual browser journey, locale/keyboard continuity and lifecycle cleanup through reload, mission switching and reduced motion.

## 6. Integrated UX/security verification

- [ ] 6.1 Run cross-mode/browser boundary acceptance: anonymous and authenticated/pending contexts, blocked service access, direct/legacy/conflicting links, back/forward/BFCache, held responses, replay/reset and repeated attempts. Assert zero attempted simulation service traffic, isolated histories/results and no simulated authority or implicit live login/resource/logout.
- [ ] 6.2 Capture and compare Catalog, OAuth Simulation Explore/Inspect, OAuth Live Demo and ePA Simulation with the actual live v2 header/design baseline. Verify DE/EN, desktop reference sizes, 390/320px, keyboard/focus/axe/contrast, reduced motion and actual native 100%/200% browser zoom; correct and record visual/provenance deviations rather than weakening checks.
- [ ] 6.3 Run the unchanged real isolated Keycloak/BFF/HAPI login/callback/refresh/allowed synthetic read/observed Inspector/CSRF logout/old-auth/history journey, focused denial/ownership/late-result regressions and existing ePA/PAR/browser tests. Record commands and actual results; mocked browser data cannot substitute for real-component evidence and production must remain untouched.
- [ ] 6.4 Run SPA typecheck/build and relevant browser, architecture, localization and formatting checks; inspect responses, displayed/copied JSON, events, storage and logs for secret disclosure. Verify live DTO/security boundaries and neutral imports remain intact, then run strict OpenSpec validation without unrelated dependency or backend changes.
- [ ] 6.5 Deliver a requirement-to-test acceptance matrix, screenshot comparisons, honest failures/unverified cases and concise updated usage/SPA rollback guidance. Verify affected documentation links and the exact changed-file scope, preserve earlier task/evidence history, and leave public deployment, data operations and archival outside this change's implementation authorization.
