# Localization Spec Delta

## Purpose

Provide a German-first, English-capable learning interface whose language can change independently of mission state, protocol data and evidence provenance.

## ADDED Requirements

### Requirement: German is the deterministic initial language

The application SHALL support German (`de`) and English (`en`). With no valid saved explicit choice it SHALL select German regardless of browser language. A valid saved choice SHALL be restored before the initial application screen is rendered.

#### Scenario: First visit from an English browser

- **GIVEN** no saved language preference and an English browser language
- **WHEN** the learner opens the catalog or a direct workspace URL
- **THEN** the first application screen is German and the language control identifies Deutsch as selected
- **AND** browser language does not override this default.

#### Scenario: Invalid or inaccessible preference

- **GIVEN** a missing, empty or unsupported saved preference, or unavailable browser storage
- **WHEN** the application starts
- **THEN** it renders in German without an uncaught storage error or unusable controls
- **AND** it does not infer a language from browser settings.

### Requirement: Explicit language selection is accessible and persistent

The application SHALL provide a keyboard-operable language control labeled with Deutsch and English on every current route. An explicit selection SHALL update the interface immediately and persist locally for reload. If storage fails, switching SHALL still work for the current page lifetime. Localization SHALL store only the language preference, never mission state or authentication material.

#### Scenario: Choose and restore English

- **GIVEN** the German catalog
- **WHEN** the learner chooses English using only the keyboard and reloads
- **THEN** English remains selected and the catalog renders in English
- **AND** the control has an accessible name, a programmatically exposed current value and visible focus
- **AND** the only localization storage entry is the supported language code.

#### Scenario: Storage writes are denied

- **GIVEN** browser storage rejects writes
- **WHEN** the learner selects English
- **THEN** the current interface changes to English without a crash or navigation
- **AND** the control remains operable to select German again
- **AND** no cookie or session workaround is created.

### Requirement: Language switching preserves active learning state

Switching languages SHALL retain the current route, mission, checkpoint, loaded fixture samples, actor or event selection, synchronized highlights and map scale. It SHALL NOT reload the document, remount the workspace as a new mission or perform a protocol operation. Reset, replay and checkpoint behavior SHALL remain unchanged.

#### Scenario: Translate a selected fixture event

- **GIVEN** loaded OAuth fixture samples, a retained checkpoint, a selected back-channel event and increased map scale
- **WHEN** the learner switches between German and English
- **THEN** the same event remains selected in the diagram, timeline and Inspector with the same involved actors
- **AND** loaded sample IDs/order, checkpoint ID, route and map scale are unchanged
- **AND** current text and accessible names change language without a reload or network execution.

#### Scenario: Preserve actor and conceptual selections

- **GIVEN** an inspected actor or checkpoint in either the fixture or conceptual mission
- **WHEN** the learner switches languages and continues navigating checkpoints, replaying or resetting where available
- **THEN** selection is retained through the switch and subsequent actions keep their existing semantics
- **AND** the conceptual mission acquires no fixture-loading action or operational results.

### Requirement: Current screens have complete translated presentation

All current user-facing prose SHALL be available in both languages, including navigation, catalog, mission/checkpoint content, diagram, timeline, Inspector, empty and recovery states, control feedback and accessibility text. Document language and title SHALL reflect the active locale and route. Brand names and legitimate technical literals SHALL remain unchanged. Counts SHALL use appropriate localized plural forms and formatting.

#### Scenario: Visit every current screen and state

- **GIVEN** either supported language
- **WHEN** the learner visits the catalog, both workspaces and unknown-route recovery, loads samples and inspects each event kind
- **THEN** visible copy, tooltips, nondecorative alternatives, accessible names and state announcements use that language
- **AND** document language and title match the active language and screen
- **AND** no untranslated resource keys or accidental mixed-language UI appear.

#### Scenario: Update feedback and counts

- **GIVEN** catalog preview counts, timeline counts and load/replay/reset/fit feedback
- **WHEN** counts are rendered or an action occurs in either language
- **THEN** count-dependent text uses the appropriate singular/plural form and locale formatting
- **AND** announcements and their interpolated labels use the current language rather than previously stored translated text.

### Requirement: Translation cannot alter protocol data or provenance

Localization SHALL preserve IDs, endpoints, channel kinds, message ordering and direction, classification and technical evidence values. Only human-readable labels and explanations SHALL change. Fixture examples and conceptual/provider-internal explanations SHALL remain distinguishable from observed traffic in both languages. No language action SHALL expose secrets or manufacture authentication, session or API outcomes.

#### Scenario: Compare safe evidence across languages

- **GIVEN** an example with technical values such as `code`, `S256`, `BFF` or `Access Token`
- **WHEN** its language changes
- **THEN** technical values are byte-for-byte unchanged while surrounding educational labels change
- **AND** human descriptions such as synthetic-data and channel explanations are localized rather than misclassified as wire values
- **AND** no raw token, verifier, code, cookie or other secret is introduced.

#### Scenario: Translate internal and conceptual explanations

- **GIVEN** the provider-internal example or the conceptual ePA workspace
- **WHEN** either language is active
- **THEN** internal operations remain labeled not observable with no HTTP arrow or actual observer/timestamp
- **AND** fixture content is explicitly labeled as examples and ePA remains a planned conceptual preview
- **AND** Keycloak's AS and IdP remain separate logical participants in one deployment.

### Requirement: Missing translations fall back safely and fail quality checks

A missing English entry SHALL fall back to its German equivalent without breaking rendering or interpolation. Released resources SHALL have matching complete keys, namespaces, interpolation parameters and plural coverage in both languages. Missing or unknown referenced keys SHALL fail development/test verification; raw key output SHALL NOT be accepted as release content.

#### Scenario: Exercise German fallback

- **GIVEN** an isolated test resource with an English entry removed and the German entry present
- **WHEN** that entry is requested in English with interpolation parameters
- **THEN** the correct German text and parameters render without changing the selected language
- **AND** the completeness check rejects that incomplete resource as releasable content.

#### Scenario: Reject translation defects

- **GIVEN** a missing namespace/key, blank required value, unknown content reference or incompatible interpolation/plural entry
- **WHEN** localization checks run
- **THEN** the check fails and identifies the offending locale and resource/key
- **AND** the shipped resources pass those same checks without exemptions for current screens.

### Requirement: Localized layouts preserve readability and accessibility

Both languages SHALL preserve the existing visual hierarchy, keyboard interactions, focus, reduced-motion behavior and synchronized selection. At supported widths and actual 200% browser zoom, translated controls and explanations SHALL remain accessible without overlapping or clipping essential content. Horizontal scrolling SHALL remain confined to the diagram where needed; text SHALL NOT be shrunk to accommodate translations.

#### Scenario: Read and operate translated layouts

- **GIVEN** German and English screens at 1366, 1024, 390 and 320 CSS pixel widths at 100% browser zoom, and desktop at actual 200% browser zoom
- **WHEN** the learner opens the catalog and both workspaces, loads fixture samples and selects message/internal examples
- **THEN** labels wrap legibly, panels align, controls remain reachable and message labels do not overlap participants, arrows or one another
- **AND** selected actors/path/Inspector remain consistent with a structured accessible diagram alternative
- **AND** keyboard language switching and accessibility checks pass in both languages.

#### Scenario: Record visual verification limitations honestly

- **WHEN** the localization change is verified
- **THEN** rendered screenshots and findings identify language, browser/version, viewport and actual zoom setting
- **AND** comparisons confirm retained design with expected text/control differences
- **AND** any untested actual browser zoom remains an explicit outstanding manual check; viewport resizing or device scaling is not reported as equivalent.
