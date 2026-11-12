# Change 001 — Repository Baseline and Path Repair Verification

**Scope:** Tasks 2.1–2.4 only; approved local/private implementation

**Date / recorder:** 2026-11-11 / Codex

## Task 2.1 — Baseline before source changes

Parent HEAD: `74ad19fb5e3d0e034c983f9276adeadb1c58d3be`. The checkout already contained 16 modified Markdown approval/readiness documents from the preceding step, with no staged changes. Preserve these changes; this is not an initial clean-tree claim. Actual components are `apps/playground`, `services/auth-client`, `infrastructure/keycloak` and canonical HAPI submodule `services/res-server`.

Both HAPI worktrees initially had clean tracked/untracked status and HEAD `253e15666f4a8640b2b13934524fe27f518e9b56` on `feat/enable-oauth`. The canonical clone uses `.git/modules/res-server`; the duplicate at `services/hapi-fhir-jpaserver-secured-starter` has its own `.git` directory. Ordinary branch/remote refs match. The duplicate additionally contains Codex checkpoint tree ref `8890e3da0a8f0f1ce401dacc356ac681d4dae56b`, absent from the canonical clone, plus reflog history and ignored build outputs. Preserve the complete duplicate clone before removing its parent gitlink.

The parent index initially has two mode-160000 entries at that HAPI commit. `.gitmodules` maps only `services/res-server`; canonical targeted status succeeds, but full `git submodule status` fails for the duplicate.

| Check                                                | Baseline result                                                                                                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool versions                                        | Node 24.21.0, npm 11.19.0; pinned pnpm 10.34.6 recovered through Corepack                                                                                                                                       |
| auth-client                                          | NestJS 11.2.7, TypeScript 5.9.3, Jest 30.5.2; package identity `@epa-auth-lab/authorization`                                                                                                                    |
| `npm --prefix services/auth-client run typecheck`    | Passed                                                                                                                                                                                                          |
| `npm --prefix services/auth-client run build`        | Passed                                                                                                                                                                                                          |
| `npm --prefix services/auth-client test -- --silent` | 8 suites / 141 tests passed                                                                                                                                                                                     |
| `npm --prefix apps/playground test`                  | Typecheck/Vite build and all 36 Playwright checks passed, including architecture, localization, browser/accessibility and layout checks                                                                         |
| Initial UI attempt                                   | 7 non-browser checks passed; 29 browser checks could not launch because the browser was missing. Installing the matching browser in a temporary cache recovered the full 36-check run; no UI/test source change |
| pnpm frozen install before repair                    | `install --frozen-lockfile --ignore-scripts` fails with `ERR_PNPM_OUTDATED_LOCKFILE`: stale `services/epa-authorization` importer, actual package `services/auth-client`                                        |
| Root ESLint before repair                            | Stale target `services/epa-authorization` is absent; typed parser project path is stale too                                                                                                                     |
| HAPI tools                                           | Default Java 17; selected installed JDK 21.0.1. Gradle wrapper 8.13; HAPI 8.12.0; Spring Boot 3.5.14                                                                                                            |
| HAPI `gradlew.bat test --no-daemon --console=plain`  | Failed before tests at `:compileJava`: cannot resolve `org.springframework.boot:spring-boot-starter-security-oauth2-resource-server:`. This existing dependency repair belongs to task 6.1, outside this slice  |
| Docker / real Keycloak                               | Docker is not installed, confirmed by the owner. No Compose, image build, container readiness or real-Keycloak integration result is claimed                                                                    |

Initial Corepack/Gradle downloads hit certificate trust errors. Using the existing Windows trust store recovered downloads without disabling certificate checks. Corepack and Playwright caches are temporary; no global package-manager installation changed. Reproducible session settings:

```powershell
$env:COREPACK_HOME = Join-Path $env:TEMP 'epa-lab-corepack'
$env:NODE_OPTIONS = '--use-system-ca'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:TEMP 'epa-lab-playwright'
$taskShims = Join-Path $env:TEMP 'epa-lab-corepack-shims'
New-Item -ItemType Directory -Path $taskShims -Force | Out-Null
corepack.cmd enable --install-directory $taskShims
$env:Path = $taskShims + ';' + $env:Path
# HAPI baseline only:
$env:JAVA_HOME = 'D:/Java/jdk-21'
$env:JAVA_TOOL_OPTIONS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
```

Use `corepack.cmd pnpm` or the temporary pnpm shim. Nested scripts invoke `pnpm`, so its shim must be on PATH; invoking Corepack alone does not supply that missing PATH entry. These settings are local tool configuration, not application configuration. For pnpm, run `pnpm test` directly; an npm-style extra `-- --silent` is interpreted as a test-path pattern by the nested script and is not the regression command.

### Fixture, style and artwork baseline

Inspected [both reference PNGs and artwork guidance](../../../docs/design/visual-references.md). All 28 generated baseline screenshots were copied to ignored `apps/playground/.cache/001-oidc-pkce-baseline/`. Catalog and loaded OAuth Workspace captures were visually inspected: existing dark hierarchy, JPEG artwork, panels, conceptual annotations and explicit fixture labels are the preservation baseline. No UI source changes are planned.

Baseline production output: `index-hCz0kJ37.css`, `index-BCSvfOA3.js`.

| File                                                          | SHA-256 before changes                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/playground/src/styles.css`                              | `1a3e2f2b5d86108ac728f7cc5eae4b38c146e6401733eaa1acb9566d723ec500` |
| `apps/playground/public/assets/epa-card-header.jpg`           | `493bb00a927e2b23f72158532a798a9f368520bc01d6e8118299ca74cad6d1df` |
| `apps/playground/public/assets/mission-catalog-hero-wide.jpg` | `27630aa607206bda74466556f252f10789da0b7d76f7248ac46f053472ec63d3` |
| `apps/playground/public/assets/mission-catalog-hero.jpg`      | `5215e92396a88ca878e50e3f5de18bf84e3e3053f539bf292fb24fa71b57ca56` |
| `apps/playground/public/assets/oauth-card-header.jpg`         | `c29d8b13765d59c3d1d2a754ddf7fbe8d434bc73b552ddf3082cd584697566b4` |
| `apps/playground/public/assets/openid-card-header.jpg`        | `a6f3cd418f444ed9878faf955041bd28fac2a01d56e521343a1f4cf122242114` |
| `apps/playground/public/assets/saml.jpg`                      | `0f358c58f705fda30a8e59eb38c350bfd708628ef65f31be44c7900b78e33976` |
| `docs/design/assets/catalog-concept.png`                      | `87cad1188a95eef92df0732635951fcf5a690b4b3b3be3f846e2af1e07af951c` |
| `docs/design/assets/workspace-concept.png`                    | `322c696b697668f3a0614f0210d2ea0c773bbbfa493d77ec136065ac0ef20c3b` |

## Task 2.2 — Canonical HAPI submodule

Completed. Moved the entire duplicate clone, including its unique checkpoint tree, reflogs and ignored build outputs, to ignored `.local-backups/001-oidc-pkce/hapi-fhir-jpaserver-secured-starter/`. No history or worktree content was deleted. Its HEAD remains the original HAPI commit and the unique tree is still readable.

Removed only the duplicate parent index gitlink. `.gitmodules` already had the correct single canonical mapping and needed no edit. `git ls-files --stage` now shows one HAPI entry, `git submodule status --recursive` succeeds, and canonical HAPI remains clean at `253e15666f4a8640b2b13934524fe27f518e9b56`.

A fresh temporary parent clone with a verification-only commit containing the gitlink removal successfully initialized recursively from the local canonical HAPI mirror. Both parent and HAPI checkouts are clean, with exactly one initialized submodule at the original commit. This tests the pending index change without committing the user's project changes or requiring remote network access. The verification mirror URL is temporary local Git configuration; the project's `.gitmodules` URL is unchanged.

The duplicate deletion is staged because gitlinks are index entries. Other pre-existing approval edits remain unstaged. `.gitignore` excludes the preserved clone; `.prettierignore` excludes that backup and the independently maintained canonical HAPI repository from root formatting.

## Task 2.3 — Node tooling and lockfile paths

Completed. Root ESLint and its typed project now target `services/auth-client`; the pnpm importer was renamed to that same real path. No dependency version, package identity or application behavior changed.

Pinned pnpm frozen installation passed with resolution skipped (504 packages), using a temporary store. With temporary Corepack shims on PATH, root `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm lint` passed. The regression result remains 8 suites / 141 tests. pnpm's default blocked optional dependency build scripts were not enabled; these checks passed without them.

The formatter initially traversed generated OpenSpec/provider files and browser caches and flagged Windows CRLF checkouts. Root ignore rules now exclude generated/copied tool artifacts, caches, preserved clone and independently maintained HAPI/UI packages. `endOfLine: auto` preserves checkout line endings without rewriting backend/UI code. Three existing Markdown differences (ADR-0003 and the two fixture documents) were normalized; formatting-only equivalence against their prior content was verified. ADR-0003 remains Accepted and its decision is unchanged. The UI's own `npm --prefix apps/playground run format:check` also passes; no UI source, stylesheet or artwork was changed.

README documents the real package path, pinned commands, temporary shim alternative and separate UI formatter ownership.

## Task 2.4 — Docker and Compose paths

Path repair is implemented; required Docker verification is blocked. Dockerfile manifest, TypeScript/source, production node_modules, dist and runtime command paths now use `services/auth-client`. The root Compose build reference points to that Dockerfile. Service `epa-authorization`, image `epa-auth-lab/authorization:local`, profile, environment, host networking, healthcheck and Keycloak configuration/volume are preserved.

Static checks with the existing YAML parser passed: Compose differs only at `build.dockerfile`; all declared local build/runtime inputs exist; the Dockerfile differs only by filesystem path replacement. Node image context excludes canonical HAPI and the preserved duplicate clone. These are static checks, not Docker Compose validation or an image-build result.

Docker is not installed, confirmed by the owner. Therefore `docker compose ... config --quiet`, backend image build and container readiness could not run; task 2.4 stays unchecked. README contains exact pending local commands, secret-safe quiet validation and the existing host-network prerequisite. No Keycloak process, volume or public deployment was changed.

## Stop boundary

Final preservation audit: all nine captured style/artwork/reference hashes are unchanged. Of the 16 pre-existing approval-document edits, only README and this change's tasks file were intentionally extended; the other 14 are byte-identical to the starting snapshot. auth-client source/tests/package identity, Keycloak realm, UI source/assets, static Playground Compose and hosting metadata match the original tracked content. Canonical and preserved HAPI worktrees are clean; the preserved checkpoint tree remains readable.

Strict OpenSpec validation and staged/unstaged `git diff --check` pass. The lockfile comparison confirms only its importer path changed; the YAML comparison confirms only the Compose Dockerfile path changed. All task wording and unchecked states from 2.5 onward are unchanged.

**Progress: 12/50 complete.** Tasks 2.1–2.3 are complete. Task 2.4 remains unchecked pending Docker/Compose/image/readiness verification. Existing HAPI dependency-resolution failure remains for task 6.1. No real-Keycloak test was possible in this environment; 141 auth-client regressions and 36 fixture UI checks passed without changing their application behavior.

Stop after the task 2.4 work and verification report. Tasks 2.5–9 remain unchecked and untouched. No new OAuth feature, HAPI security implementation, Keycloak change, public deployment or Mission Control redesign is included.
