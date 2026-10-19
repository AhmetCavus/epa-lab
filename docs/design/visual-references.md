# Visual References — Mission Control

**Status:** Design reference for the first UI slice.

These two images belong to the project's UX baseline. Review them before implementing the Mission Catalog or the Mission Workspace; do not substitute an unrelated generic dashboard template.

## 1. Mission Catalog

![Mission Catalog high-fidelity concept](assets/catalog-concept.png)

**Carry into the UI:** dark navy surfaces; restrained blue/cyan emphasis; well-spaced mission cards; prominent mission selection; consistent status labeling; descriptive mission content.

**Adapt deliberately:** the mockup includes speculative mission families, metrics, menu items, banners and "available" labels. Implement only actual catalog entries and navigation. Do not mark the OAuth mission executable until its integration is verified. Avoid decorative controls without a working action.

**Details:** [mission-catalog.md](mission-catalog.md).

## 2. Mission Control Workspace

![Mission Catalog and Mission Control Workspace high-fidelity concept](assets/workspace-concept.png)

**Carry into the UI:** persistent context of current mission; left-side objectives; central actor/sequence visualization; accessible step selection; compact explanation/inspector; dark technical visual language.

**Adapt deliberately:** the sample sequence is illustrative, not an exact OAuth trace. It must not imply step-by-step control over Keycloak internals. Replace the mockup's "Raw Data" tab with **Safe Evidence**; differentiate **Observed**, **Explained** and **Not observable**. The Shell must also work with the ePA fixture.

**Details:** [mission-workspace.md](mission-workspace.md) and [visual-system.md](visual-system.md).

## Implementation rule

Use the PNGs as **visual targets**, and the Markdown design/specifications as the source of truth for behavior and protocol correctness. Where a visual detail conflicts with a requirement, implement the requirement and briefly record the adaptation. No pixel-perfect replication requirement; preserve the recognizable layout, hierarchy, and styling.

The first UI slice uses clearly labeled demo events only. It must not show a fake successful authentication or expose secrets.
