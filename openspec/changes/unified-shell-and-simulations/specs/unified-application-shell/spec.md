# Unified Application Shell

## Purpose

Give the catalog and all supported mission execution modes one recognizable, accessible
Mission Control v2 identity while preserving existing artwork and live behavior.

## ADDED Requirements

### Requirement: One authoritative application header

The application SHALL reuse one shared header across the catalog, OAuth simulation,
OAuth live demo and conceptual ePA simulation. It MUST render exactly once per page and
preserve the live v2 navy palette, typography, desktop geometry, spacing and brand hierarchy.

#### Scenario: Navigate every supported surface

- **WHEN** a learner visits the catalog and each simulation/live workspace
- **THEN** the same header composition and language selector appear exactly once
- **AND** the catalog does not retain a second older header hidden behind the workspace.

#### Scenario: Match the live design reference

- **WHEN** desktop captures are compared with the current live v2 reference
- **THEN** header height, logo frame, typography, navigation spacing and navy surfaces match
- **AND** responsive reflow preserves that identity without unrelated visual redesign.

### Requirement: Official locally served Yappai identity

The shared header MUST use the official Yappai icon from the existing Yappai website
assets. It SHALL serve a verified local copy, preserve its appearance and aspect ratio,
and provide an accessible brand link. It MUST NOT substitute an invented mark or require
runtime access to an external branding origin.

#### Scenario: Verify the official asset

- **WHEN** the header is rendered in either locale or execution mode
- **THEN** its icon matches the identified official asset, with documented source and byte identity
- **AND** no hand-drawn replacement, external image request or stretched logo appears.

### Requirement: Context-aware navigation preserves presentation state

Header navigation SHALL expose valid contextual destinations and identify the current
catalog or Explore/Inspect view accessibly. Execution selection MUST be distinct from
Explore/Inspect. Presentation navigation SHALL preserve the selected mission, execution
kind and eligible run/event state without initiating authentication or resource operations.

#### Scenario: Catalog and workspace navigation

- **WHEN** the catalog is open
- **THEN** its catalog destination is active and no Explore/Inspect link silently selects a mission
- **WHEN** a workspace is open
- **THEN** Explore/Inspect identify the active view and retain the current execution selection
- **AND** all links work with keyboard navigation and browser history.

#### Scenario: Change language without replacing the run

- **WHEN** the learner changes between German and English through the shared selector
- **THEN** mission, execution kind, view, event selection, simulation progress or owned live run remain intact
- **AND** only the explicit locale preference is persisted, with German as default/fallback.

### Requirement: Explicit catalog actions reflect available execution

The OAuth card SHALL offer primary `Simulation starten` and secondary `Live-Demo starten`
actions, with matching English translations. The ePA card SHALL offer only primary
`Simulation starten`. Actions MUST select the intended workspace without starting its
protocol flow. Live availability MUST remain subject to the existing runtime binding.

#### Scenario: Open either OAuth experience

- **WHEN** a learner activates either OAuth action
- **THEN** the selected Simulation or Live Demo workspace opens with its provenance visible
- **AND** no authorization redirect or resource read occurs until a subsequent explicit execution action.

#### Scenario: ePA and unavailable live bindings

- **WHEN** the ePA card is shown
- **THEN** its simulation is available and it has no live-demo action
- **WHEN** the configured runtime does not support live OAuth
- **THEN** simulation remains available and the OAuth live action is unavailable with an explanation
- **AND** manipulating the link cannot enable live execution.

### Requirement: Preserve catalog composition and aligned actions

The catalog SHALL preserve its existing two mission artworks, responsive hero, navy theme,
card hierarchy and grid. Action controls SHALL have consistent sizing and an 8–12 CSS-pixel
gap; card heights, internal spacing and action alignment SHALL remain consistent without
adding an empty actionable control to the ePA card.

#### Scenario: Compare desktop and mobile cards

- **WHEN** both cards are captured in DE/EN at desktop and narrow widths
- **THEN** title, topics, card bodies and action regions align without overlap or clipped labels
- **AND** the OAuth action gap measures 8–12 CSS pixels and mobile reflow retains usable targets
- **AND** existing artwork bytes and crop intent are preserved.

### Requirement: Availability and introductory copy are truthful

Catalog and shell copy SHALL distinguish available simulations, the existing real OAuth
demo and the absence of live ePA integration. It MUST NOT claim that no live integration
exists in the deployed OAuth runtime or describe conceptual ePA as operational or certified.

#### Scenario: Read availability before choosing a mission

- **WHEN** a learner reads the catalog introduction, card badges and notices in either locale
- **THEN** OAuth simulation and live availability are clear, and ePA is labeled conceptual simulation
- **AND** no old blanket fixture-only or no-live-integration statement contradicts the actual runtime.

### Requirement: Verify a consistent accessible visual experience

The shared shell and catalog SHALL support DE/EN, keyboard operation, visible focus,
semantic navigation, reduced motion and WCAG 2.2 AA. They MUST reflow at mobile widths and
native 200% browser zoom. Acceptance SHALL compare actual captures of the catalog, OAuth
Simulation Explore/Inspect, OAuth Live Demo and ePA Simulation against the live v2 baseline.

#### Scenario: Complete the visual and accessibility matrix

- **WHEN** the five surfaces are reviewed in both locales at desktop and 390/320 CSS-pixel widths,
  with reduced motion and actual native 100%/200% browser zoom
- **THEN** header/logo/navigation, card alignment, navy palette, typography and provenance remain consistent
- **AND** keyboard focus and language controls remain reachable without page-level horizontal overflow
- **AND** screenshot comparisons and accessibility results record deviations and unverified cases explicitly.
