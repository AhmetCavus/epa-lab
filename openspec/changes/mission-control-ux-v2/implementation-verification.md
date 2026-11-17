# Mission Control implementation verification

Branch: `feat/mission-control-v2`. Owner implementation approval: 2026-11-16.
Production deployment, infrastructure changes and archiving remain excluded.

Current result: all implementation and acceptance work is verified; see the
[nine-area acceptance matrix](acceptance-matrix.md) and [visual comparison review](visual-comparison.md).
Earlier task sections below retain their incremental verification scope; later integrated
results supersede their explicitly pending follow-ups.

## Verification scope

Browser presentation tests use the existing explicit private Vite binding on loopback
and the existing version-1 synthetic test DTOs. Their screenshots are **test evidence**,
not observations of public OAuth execution. Real-component acceptance is tracked separately
under tasks 5.5 and 6.2/6.5; a browser fixture does not satisfy those security requirements.

The protected production configuration and all 49 existing container identities/images/
mounts/start times were captured read-only before implementation in the ignored private
baseline `.local-backups/mission-control-ux-v2/implementation-o4_34wsh/production-baseline.json`.
No credential values are included in this report.

## Shared frame — task 1.1

- TypeScript checking and the ordinary SPA build pass.
- Two focused browser/palette checks pass, including an axe WCAG A/AA scan.
- Actual Chromium capture: [shared shell, 1672×941](evidence/01-shared-shell.png).
- Compared visually with `01-explore.png`, `04-resource-explorer.png` and the navy baseline:
  the 58px header, 246px sidebar, main content left edge, 30px heading, restrained borders,
  14px panel corners and navy/cyan palette match the intended shared geometry.
- The primary gradient is slightly darker than the illustrative reference so white text
  meets 4.5:1 contrast at its brightest stop. The language selector remains visible; no
  illustrated user identity, Learn destination or permission claim was invented.
- This capture deliberately verifies the shared frame only. The temporary objective/action
  content and inspection disclosure are replaced in the subsequent ordered tasks; no full
  Explore/Inspect/Flow/Explorer visual acceptance is claimed here.

## Presentation navigation — task 1.2

- TypeScript and all four focused frame/navigation checks pass.
- Direct Inspect URLs, invalid presentation-value fallback, keyboard activation, panel
  changes and actual browser back/forward pass. The selected callback event and owning run
  survive view changes; the complete request counter remains unchanged during navigation.
- Inspect reclaims the mission sidebar area. It currently reuses the existing safe
  Timeline/Inspector; its final three-column composition is deliberately task 3.1.
- Only the allowlisted presentation fields are generated in navigation URLs; no run ID,
  credential, callback or execution instruction is placed there.

## Capability and preview preservation — task 1.3

- The three existing architecture checks pass: dependency/public-entry rules, no cycles,
  and canonical domains compiling without React/browser libraries. No framework/dependency
  was introduced. The shared frame consumes supplied presentation; OAuth execution stays
  in the existing mission application coordinator and safe DTO adapter.
- Existing fixture/Catalog/conceptual ePA browser scenarios pass, including responsive
  fixture access. Five current shell/navigation checks and all four localization-resource
  checks pass; an inline brand label was moved into matching locale resources.
- Actual mission navigation retains explicit English and reaches conceptual ePA with no
  runtime actions or execution calls. Preview presentation no longer contains unreachable
  runtime branches; its observable fixture controls remain unchanged.
- [Completed group-1 shell/navigation capture](evidence/01-navigation-shell.png), 1672×941,
  was inspected against the Explore/Explorer frame: header/sidebar/main alignment and
  sidebar separators/quick links match the layout hierarchy. Locale replaces the unsafe
  illustrated identity, and unavailable Learn navigation is omitted. Body compositions
  remain deliberately pending groups 2–5, rather than claimed visually accepted.
- Workspace and visual-reference guidance now distinguish v2 runtime precedence from the
  retained historical canvas/preview contract.

## Explore state model — task 2.1

- Fifteen state/projection cases and six current shell/browser cases pass, alongside
  TypeScript checking. Cases cover anonymous/restoring/navigation, pending/failed/denied/
  cancelled/expired/signed-out runs, retained older authentication, missing history,
  resource denial/capacity and actual versus unverified resource success.
- The primary role changes to Fetch for current authenticated ownership; a later failed
  run cannot borrow success from an older authentication. Unobserved token/session steps
  remain unavailable, while a valid session still enables resource work.
- The browser's resource action becomes enabled after the authoritative session response
  even while teaching-event retrieval is deliberately held pending. No FHIR preflight or
  catalog request occurs. The existing asynchronous identity checks still discard old
  history responses, and history from another run is cleared before the new view is ready.
- OAuth request/exchange/token validation and all server contracts remain unchanged.

## Explore composition — task 2.2

- Actual [authenticated](evidence/02-explore-authenticated.png) and
  [anonymous](evidence/02-explore-anonymous.png) Chromium captures at 1672×941
  were inspected against the Explore target. Both composition/axe scenarios pass.
- Corrected participant spacing/start position, status symbol column, stage gap and
  secondary-action wrapping after browser comparison. The authenticated hero starts
  at y=238 and its footer at y=386, matching the reference; participant cards begin
  at x=851 (reference approximately 852). Header/sidebar/title remain aligned.
- Anonymous copy was shortened to retain readable typography without desktop page
  scrolling. Stage selection changes explanation only; exactly one action is dominant.
- Four real participants replace illustrative provider checks/arrows. No giant sequence
  or scattered event cards appear by default. The lower fixed-read placeholder remains
  pending the explicitly ordered Explorer tasks; this is not full Explorer acceptance.

## Explore lifecycle — task 2.3

- All 26 adapted/extended SPA runtime cases pass; TypeScript passes. Tests now navigate
  explicitly to Inspect rather than expecting the retired default sequence diagram.
- Real top-level login navigation, fresh transaction identities, clean restoration,
  CSRF logout, BFCache/expiry, pending cancellation, unsafe session/history rejection,
  unavailable/full teaching storage and late resource/history responses remain covered.
- Session/restoration and logout commit before optional history retrieval. A deliberately
  held history read does not postpone logout or re-enable its resource action. Existing
  abort/current-operation guards discard superseded responses.
- Logout restores keyboard focus to the next available action; stage and event selection
  survive mode/locale changes. Capacity errors are safely localized and cleanup remains
  independent. No OAuth endpoint or exchange implementation was changed.

## Explore localization/accessibility — task 2.4

- Matching DE/EN state/stage/action resources pass all four localization quality checks.
  The state/action table and announcement/focus semantics are documented in the current UX guide.
- Eight DE/EN Explore scenarios at 1366/1024/390/320px pass keyboard, live-region,
  stage-selection/no-execution, no horizontal overflow and axe checks. Both state-capture
  scenarios pass. A German test assertion was corrected to the actual localized result.
- Actual full Chromium 141 native 100%/200% tests pass for both locales, including fixture,
  active runtime, HAPI-denial presentation and signed-out controls. Chrome's Settings API
  readback is 1/2; DPR is 1/2, visualViewport scale remains 1, no CSS zoom is used.
  [Retained native metrics](evidence/02-native-zoom-de.json) record 1366→683 CSS-pixel width.
- Native zoom/accessibility will be repeated with the completed Inspect/Flow/Explorer in
  task 6.4; these results cover the currently completed Explore group.

## Inspect composition/selection — task 3.1

- Two focused browser scenarios pass: native 1585×992 three-column geometry/axe and
  actor/channel/outcome filtering with exact ordered IDs, synchronized details and bounded
  previous/next controls. All three architecture checks pass; TypeScript passes.
- [Actual column capture](evidence/03-inspect-columns.png) was inspected against the target:
  left edge 12px, 14px gaps and 26:46:28 proportions are verified. Heading/card start is
  y=192 versus approximately 188 in the target. Inherited full-width timeline placement
  and overly tall stacked metadata rows were corrected after browser inspection.
- Missing token/identity claims and run-history APIs are not invented. Current safe run
  metadata replaces the illustrative identity/token panels. Detail density/disclosure and
  final bounded vertical layout are completed/compared in task 3.3.

## Inspect safe contract/provenance — task 3.2

- All 46 existing adapter/runtime cases pass plus the new focused transport/provenance
  contract case. Version-1 producer/consumer parity covers all 21 event kinds.
- Callback transport remains Browser→BFF; BFF-local validation has no source/target edge;
  resource decisions retain observer auth-client and explicit reporter res-server.
- Four malicious/unsupported browser-history cases now capture console/page errors and
  assert both credential sentinels absent, in addition to DOM/storage assertions.
  Unknown versions, extra secret fields, broken sequences and wrong run ownership have
  no raw fallback and cannot fabricate progress. Existing server event schemas are unchanged.

## Inspect disclosures/accessibility — task 3.3

- Six Inspect browser cases pass, including DE/EN at 1585px and 390px, native evidence
  disclosure keyboard/focus, empty/unsupported history and axe. TypeScript passes.
  Localization quality (4) and unchanged fixture/concept scenarios (6) pass.
- [Completed desktop Inspect](evidence/03-inspect.png) and [mobile](evidence/03-inspect-mobile.png)
  were visually inspected. The observed summary is compact, provenance is a separate card,
  technical fields use native disclosure and both local scroll regions are keyboard usable.
  The final card start was adjusted four pixels to the reference's y=188.
- Current UX documentation distinguishes actual evidence, interpretation and provider
  internals, and explicitly omits unsupported run-history/token/identity content.
- Safe metadata cards differ from the illustrative claims/credentials panels by design;
  fonts/panels/nav hierarchy and three-column composition preserve the visual target.

## Recorded playback controller — task 4.1

- Four deterministic browser-clock cases and all three architecture checks pass; TypeScript
  passes. Play/pause/previous/next/replay and end pause traverse exact recorded IDs only.
- Empty and three-frame incomplete histories remain empty/three frames. Leaving the flow
  cancels advancement; replacing the run restores paused at its first real frame.
- Execution counters stay unchanged throughout transport changes. The controller owns only
  presentation timing/selection and cannot access OAuth/resource APIs. The 1200ms cadence
  is explicitly presentation timing, not a measured protocol duration.

## Animated Flow composition — task 4.2

- Five playback/mapping browser cases and three architecture cases pass; TypeScript passes.
  Actual callback/front-channel and token-exchange/back-channel paths, grouped Keycloak
  roles and BFF-local arrowless checks are verified. Transport/overview selection executes
  no protocol calls and does not change the independently derived authentication stages.
- [Actual 1672×941 Flow capture](evidence/04-animated-flow.png) was inspected against the
  Animated Flow target. The first capture was too tall; overview height, card copy and
  spacing were corrected and recaptured. It now fits without page scrolling, ending at
  approximately y=912 versus the reference's 920. Four participants replace repeated
  Browser/BFF illustrations while retaining the main flow/right overview/card/transport hierarchy.
- Arrow source/target come from the selected validated event, including Browser→BFF
  callback. Participant highlights do not claim provider internals were observed.

## External-login reconstruction — task 4.3

- [Real callback evidence](evidence/04-real-callback.json) and [actual screenshot](evidence/04-real-callback.png):
  disposable immutable Keycloak 26.8.2, real compiled NestJS BFF and loopback private SPA.
  Normal provider password login returns to the exact clean workspace, immediately enables
  the resource action and reconstructs nine owned events, paused after callback and reload.
  One login navigation, zero resource reads, zero logouts; callback path is Browser→BFF.
- The test uses tmpfs provider data and an ephemeral loopback callback binding restored
  before the provider preservation comparison. It rejects any PostgreSQL env-file input;
  no live database, provider, volume or public route is attached.
- [54 real provider regression checks](evidence/04-real-provider-regression.json) pass across
  standard/public Code/S256 profiles, genuine required PAR for ePA, wrong/missing verifier,
  client-secret/redirect/grant denials, account provisioning and secret disclosure checks.
- A deterministic failed-run browser case stops on its actual failure even if a later
  cleanup event exists; it invents no ideal success and issues zero execution requests.

## Playback accessibility/localization — task 4.4

- Thirteen playback cases pass, including six reduced-motion DE/EN cases at 1672/1024/320px,
  keyboard focus/manual frames, zero execution and axe. Locale preserves playback intent;
  switching the actual media preference cancels autoplay. Long German event titles were
  corrected to wrap within the narrow card, then the failing 320px case passed.
- Native Chromium 100%/200% fixture/runtime/Flow checks pass in both locales, including
  keyboard stepping and no horizontal overflow. [DE metrics](evidence/04-native-zoom-de.json)
  and [EN metrics](evidence/04-native-zoom-en.json) retain native Settings readback/DPR evidence.
- Reduced motion disables autoplay, pulses and moving paths and provides the same instant
  selected frames. Manual overview/position selection pauses playback. Current UX guidance
  documents reconstruction, observation limits, timer cleanup and presentation-only timing.
- TypeScript and matching localization-reference/parity checks pass. Final combined view
  zoom/accessibility is repeated after Explorer completion under task 6.4.

## Session-enabled one-entry form — task 5.1

- Eight form-availability/no-preflight cases, fifteen state projections and eight current
  shell cases pass (including a corrected compact anonymous layout). TypeScript passes.
- The mission supplies only Basic/playground-demo. The server's matching finite selector
  definition is explicit; its existing fixed trusted upstream remains unchanged. Selected
  routing/independent enforcement is the immediately following task 5.2.
- Form fields and Fetch enable directly from current owning standard authentication,
  including pending event history. Anonymous/expired/signed-out/pending/later-failed and
  missing-current-run states disable them; conceptual ePA has no form. Client invocation
  rechecks current session/run expiry. Edited unapproved IDs cannot execute the fixed action.
- Opening, restoring, changing the field and mode navigation issue zero FHIR/catalog calls.
  No catalog endpoint, eligibility DTO/store or preflight request was introduced.

## Bounded existing resource route/proxy — task 5.2

- 84 standard-browser/public-proxy HTTP cases pass plus two additional selected-request
  ownership/credentials/body/method cases. Selected query keys are exactly resourceType and
  resourceId. Malformed/duplicate/extra/object/array/oversized/traversal values reject 400;
  well-formed unapproved pairs reject 403 before upstream contact.
- Selected requests enforce current owning authentication/run before contact and again after
  asynchronous work. Anonymous/ePA-only/ended/expired/pending contexts cannot bypass it.
  Legacy no-query behavior, including its retained-authentication semantics, stays compatible.
- [Actual disposable Nginx evidence](evidence/05-resource-proxy.json) passes exact query
  forwarding, trusted ingress/headers, HEAD/write methods, unknown/encoded/direct-FHIR/catalog
  path denials, actual 429, deliberate recovery and independently available logout. Existing
  production template/includes are mounted read-only; no routing file changed. Logs contain
  operation/status only, not selectors. The upstream target remains fixed by configuration.
- Selected safe FHIR representation/versioning follows in task 5.3; no-query summary/session/
  event schemas remain unchanged.

## Versioned safe FHIR contract — task 5.3

- 121 BFF/resource cases and 30 SPA selected/legacy adapter cases pass. Both SPA/BFF
  TypeScript checks pass. Trusted producer/consumer schema parity is tested without coupling
  deployed frontend code to backend source.
- Exact selected reads return schemaVersion 2 with an actual validated Basic code object,
  exact identity and optional validated version/time metadata. Source metadata is omitted.
  The no-query three-field summary, session and version-1 event shapes stay compatible.
- Wrong identity/type/code, narrative/extensions, secret fields, unsafe metadata, malformed
  JSON/media and streamed/compressed responses above 64KiB fail closed without payloads.
  Selected 404 is distinct from owned-event 404; observed response status remains recorded
  through the existing version-1 event kinds without a fabricated authorization report.
- Typed outcomes distinguish HAPI 401/403 from BFF session/allowlist rejection. Actual
  boundary 429 bodies are never parsed/displayed; only bounded numeric Retry-After is used.
  Unknown fields/versions/status-report inconsistencies are rejected with safe errors.

## Resource Explorer UI/lifecycle — task 5.4

- Eighteen resource browser cases, 26 lifecycle cases and the architecture/localization
  checks pass. The held-history case additionally verifies that an actual selected result
  displays while history remains pending. SPA TypeScript passes.
- [Actual 1672×941 Explorer](evidence/05-resource-explorer.png) was compared and corrected
  against the resource target: banner y=260, card y=379, bottom approximately 906 versus
  target 905. Corrected form proportions, 305px primary action, compact status, typography,
  result height and JSON syntax/line numbers. No page scrolling at the native target.
- Form submits only its explicit exact selection; the first request includes exactly the
  two selectors. Tabs, locale and copy issue no protocol work. Clipboard equals the same
  validated FHIR projection shown in JSON. Metadata shows actual safe version/time and
  explicitly unmeasured latency/size; no raw-response view exists.
- HAPI 401/403/404 clear previous JSON while current authentication keeps Fetch enabled.
  BFF 401 clears data and disables the form with a distinct explanation. Boundary-shaped
  429 honors bounded Retry-After without auto retry/events and leaves logout usable.
- Logout immediately clears JSON, aborts/discards held results; unsafe or foreign-run
  payloads never replace the view. DE/EN 320px keyboard/axe checks pass. Actual real HAPI
  security/404 evidence is the next ordered task, not inferred from these browser fixtures.

## Real HAPI security/missing fixture — task 5.5

- [184 existing HAPI checks](evidence/05-hapi-gradle.json) pass, including 62 real embedded
  Tomcat/JPA security integration cases with signed JWTs/trusted JWKS, negative routes and
  secret-log scans. Java 21 ran in an isolated existing build image using current read-only
  source. Missing offline test dependencies were resolved in that disposable build only.
- [20 real runtime checks](evidence/05-hapi-runtime.json) pass against the reviewed immutable
  HAPI image: 200 with permission, 401 missing/expired/forged/ID Token/wrong issuer/audience/
  future/algorithm credentials, 403 missing scope and all Patient/Observation/extra-ID/search/
  history/query/write denials. Actual BFF resource parsing receives the safe HAPI report.
- A second fresh in-memory HAPI installation with seeding disabled returns actual 404 for
  the exact allowed Basic/playground-demo. No fixture is deleted; its BFF observed report is
  explicitly unavailable. Both disposable servers have no volumes and are removed afterwards.
- Existing [actual Nginx evidence](evidence/05-resource-proxy.json) covers 429, explicit
  recovery and independent logout. This is a boundary decision, never a fabricated HAPI event.
- HAPI source/security/configuration and production data are unchanged; the submodule remains
  clean. No production PostgreSQL service, object, role, data or privilege was accessed.

## Explorer API/UX documentation — task 5.6

- Current backend API, system-context and workspace UX documents describe immediate
  session availability, zero preliminary FHIR/catalog/eligibility work, the exact compatible
  two-selector route, version-2 safe projection and untouched legacy/session/event contracts.
- The source/status recovery table distinguishes BFF authentication/allowlist rejection,
  independent HAPI authentication/authorization rejection, actual allowed-fixture 404 and
  boundary 429. It records bounded retry, safe unknown metadata and independent cleanup.
- The documented fictional selected JSON example passes both actual producer and consumer
  contract validation. Future entries explicitly require separate fixture/policy/allowlist/
  negative-test approval. Documentation identifies this branch extension as not deployed.

## Native visual acceptance — task 6.1

- Five actual native capture cases pass, including the four complete desktop views and
  the older navy identity baseline. Desktop documents fit their native target viewports.
- [Comparison review](visual-comparison.md) includes all five native side-by-side/overlay
  pairs, reproducible hashes, geometry/type/color findings and explicit necessary deviations.
  Images were visually inspected and corrected; no masking/resizing conceals differences.
- Inspect columns now match the reference's symmetric outer panels. Filters use a compact
  keyboard disclosure; a regression verifies Inspect filtering cannot constrain playback.
- The older narrow baseline also retains a full-page capture so below-fold content is visible.

## Complete isolated HTTPS journey — task 6.2

- [Real HTTPS runtime evidence](evidence/06-real-https-runtime-results.json) passes using
  new verification-only SPA/BFF images, immutable Keycloak 26.8.2, the reviewed HAPI image,
  actual Nginx/Traefik and a private test CA with normal hostname/chain verification.
  All containers were disposable, loopback-only, unregistered with live Traefik and removed.
- Real login returns to the clean fixed workspace; refresh retains the run. Explorer is
  enabled before any resource request. The sole explicit Fetch sends exactly
  `resourceType=Basic&resourceId=playground-demo` and displays actual validated HAPI JSON.
- Inspect displays the explicit HAPI report; callback playback shows Browser → BFF.
  Mode/filter/manual/play/pause/locale actions preserve run identity and issue zero
  login/resource/logout calls. Local logout clears JSON, invalidates old credentials and
  retains only eligible owned safe observations. Missing CSRF and foreign ownership fail.
- [54 provider checks plus runtime](evidence/06-real-https-results.json) pass, along with
  actual ePA BFF integration, proxy trust/path/method/cache/rate/error-log denials and
  disposable fixture withdrawal. DE/EN real Firefox axe checks pass at 1366/390px.
- [Explore](evidence/06-mission-control-real-explore.png),
  [Inspect](evidence/06-mission-control-real-inspect.png),
  [Flow](evidence/06-mission-control-real-flow.png) and
  [Explorer](evidence/06-mission-control-real-resource.png) are actual component captures.
- Harness adaptation initially selected a hidden inline tab/duplicate hidden language
  control. Those failed runs are not acceptance evidence; corrected visible navigation
  passes. Twenty additional focused Firefox Inspect/playback cases pass.
- This is isolated test-CA verification, not public activation or live-host acceptance.

## Combined negative acceptance — task 6.3

- [79 SPA cases](evidence/06-negative-spa.json) and
  [106 focused BFF cases](evidence/06-negative-bff.json) pass. Added selected-route races
  for logout and a later current-run replacement; an actual received HAPI response remains
  honest evidence but cannot produce an allowed payload after ownership changes.
- Forged enabled DOM cannot authorize an anonymous submit. Expiry, BFCache ownership
  replacement and reload clear previously validated JSON without another resource read.
  Held late results, unsafe/foreign payloads, failed/full history and stale owned cookies
  fail safely; independent logout remains available. No browser credential/payload diagnostics.
- [Actual proxy negatives rerun](evidence/06-negative-proxy.json) pass, including bounded
  selector forwarding, 429/recovery and independent logout. HAPI's independent security
  evidence remains the 184 Gradle/20 runtime checks from 5.5 and real HTTPS checks from 6.2;
  no policy or data changes were made between these checks.

## DE/EN, keyboard, reflow and native zoom — task 6.4

- All [28 German](evidence/06-accessibility-de.json) and
  [28 English](evidence/06-accessibility-en.json) completed-view combinations pass at
  1672/1585/1366/1024/706/390/320 CSS px, including expanded evidence. Zero axe
  WCAG 2A/AA, 2.1AA and 2.2AA violations; no page horizontal overflow. The four reference
  desktops fit without document scrolling. Keyboard focus, disclosures, status semantics,
  form/tabs and reduced-motion manual controls pass alongside existing focused checks.
- Actual Chromium native zoom [DE](evidence/06-native-zoom-de.json) and
  [EN](evidence/06-native-zoom-en.json) passes at 100% and 200%: browser Settings readback
  1/2, DPR 1/2, 1366/683 CSS px, visual viewport scale 1 and no CSS zoom. Fixture, Explore,
  selected JSON, denial, Flow, Inspect and logout remain accessible. Native viewport PNGs
  use compositor capture with verified physical width; the earlier full-page capture helper
  cropped zoomed images and is superseded. Browser zoom is not simulated by viewport scaling.
- Manual image/DOM review corrected expanded Inspect height, added keyboard focus to its
  scrolling metadata and retained 16px actor labels with diagram-local keyboard scrolling
  at narrow sizes. Text/control/focus contrast checks pass, including the strengthened
  language-select border; no light theme or shrinking-to-fit was introduced.
- Review samples: [mobile Explore](evidence/06-matrix-en-320-explore.png),
  [mobile Flow](evidence/06-matrix-de-320-flow.png),
  [mobile Explorer](evidence/06-matrix-de-320-resources.png),
  [native 200% Inspect](evidence/06-native-de-200-inspect.png).
  Narrow pages stack naturally; code/diagram/evidence use local scrolling. No screen-reader
  product certification is claimed; semantics, axe and actual browser keyboard behavior were checked.

## Complete regression packet — task 6.5

- [177 SPA checks](evidence/06-spa-regression.json) pass across all 17 files, with zero
  skips, unexpected failures or flaky cases. The same run includes architecture, locale
  resources, conceptual ePA/fixture behavior, lifecycle/contract negatives, all completed
  views and real native zoom. SPA TypeScript/build and complete frontend format check pass.
- [462 BFF checks in 16 suites](evidence/06-bff-regression.json) pass, with TypeScript/build.
  The unchanged HAPI checkout retains its [184 relevant checks](evidence/05-hapi-gradle.json)
  and [20 actual runtime denials/missing-fixture checks](evidence/05-hapi-runtime.json);
  no later HAPI source/configuration change invalidates those results.
- The [final SPA image HTTPS rerun](evidence/06-final-https-results.json), with its
  [exact image/runtime record](evidence/06-final-https-runtime-results.json), passes all
  54 provider checks, the real browser/BFF/HAPI journey, ePA required-PAR/header/browser
  integration, proxy limits/denials, safe diagnostics and targeted disposable withdrawal.
  Initial final-run image config-digest lookup failed before BFF startup; the corrected
  runnable manifest digest passes. No failed run is counted as acceptance evidence.
- [Preservation snapshot comparison](evidence/06-preservation.json): all 14 protected
  configuration files and all six ePA Lab containers retain their original hashes,
  IDs/images/mounts/start times. Forty-three original host containers remain identical.
  Six unrelated Teberru/Yappai containers were replaced outside this task; that external
  host drift is recorded rather than described as unchanged or reverted.
- HAPI submodule, provider/security configuration, production data/privileges and original
  offline H2 remain untouched. All test containers are disposable; no public deployment,
  live database operation or volume reset/delete was performed.
- Deliberate differences are the four approved V2 compositions and the compatible
  two-selector/version-2 resource response. Fixture/conceptual ePA behavior and original
  stylesheet contents remain the preservation baseline. There are no test regressions.
- Build advisories remain Rollup's existing Zod annotation and >500kB chunk notices;
  they do not fail the build. No new framework or dependency was added.

## Final acceptance and documentation — task 6.6

- The [nine-area acceptance matrix](acceptance-matrix.md) links actual evidence for every
  design acceptance area, distinguishes fixture screenshots from real components and
  records exact scope/limitations. Current UX/API/system-context/reference guidance is
  coherent; prior implementation and release reports are retained.
- [Strict OpenSpec validation](evidence/06-openspec-validation.json) passes with zero issues.
  All local evidence links resolve, original approved PNGs are unchanged, final comparison
  hashes/dimensions match the delivered captures, frontend format and git whitespace checks pass.
- All 26 ordered tasks have verified completion. The owner review captures are linked from
  the matrix. The change remains active/unarchived; public deployment is unchanged.

## Remaining deviations and blockers

No blocker remains for isolated implementation. See the acceptance matrix for necessary
visual/security differences and verification limits. Public release was not performed and
needs a separate explicit instruction. Six unrelated host-container replacements are recorded
as external drift; the six ePA Lab containers and all protected files remain unchanged.
