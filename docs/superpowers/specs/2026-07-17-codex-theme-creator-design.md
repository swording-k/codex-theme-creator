# Codex Theme Creator Design

## Goal

Turn this repository from a collection of Codex Dream Skin presets into a macOS-first theme creation system. A user can describe a theme in natural language, attach one or more visual references, or combine both. Codex then designs, builds, installs, verifies, and packages a complete theme rather than only replacing the background.

The first release must complete this loop:

```text
idea or reference image
  -> visual plan
  -> generated assets and UI profile
  -> compiled theme package
  -> real Codex installation
  -> home and task visual QA
  -> corrected, shareable theme
```

## Product Form

The public product is one code repository with two installable parts:

1. **Codex Theme Creator Skill**: the agent workflow that interprets the request, creates assets, compiles the theme, performs QA, and reports evidence.
2. **macOS Theme Runtime**: the local renderer that safely applies the compiled theme to Codex Desktop and can restore the original appearance.

The repository also contains the theme schema, compiler, validators, tests, example themes, installation scripts, and author documentation. Users should not need to edit JSON or CSS for the normal workflow.

## User Experience

Typical requests include:

```text
Create a premium GT racing theme from this reference image. Make the whole
sidebar, home cards, project selector, and composer match the scene. Install it
and verify both a new chat and an existing task.
```

```text
Create a calm rainy forest coding theme. Keep text highly readable and use
subtle rain on the home screen, with a quieter task view.
```

The Skill performs these stages:

1. Infer a name, mood, visual hierarchy, light or dark appearance, and suitable motion from the request.
2. Analyze supplied references and preserve their useful composition and palette cues without copying embedded application UI.
3. Generate or prepare an edge-to-edge background with explicit safe regions for native Codex content.
4. Create a structured UI profile covering every supported native surface.
5. Create optional decorative and motion profiles appropriate to the theme.
6. Compile and validate a portable theme package.
7. Install and switch the theme in the real Codex Desktop app.
8. Capture the new-chat route and an existing-task route, run deterministic checks, and visually review both.
9. Correct contrast, occlusion, excessive masking, or misplaced focal art, then repeat verification within a bounded repair loop.
10. Preserve the installed theme and export a shareable package with previews and instructions.

## Architecture

### Theme Creator Skill

The Skill owns orchestration and decision-making. It accepts text-only, reference-only, or combined input. It invokes the installed image generation capability for visual assets and repository scripts for deterministic analysis, compilation, installation, and QA.

The Skill must keep evidence states separate:

- **created**: package files exist and validate;
- **installed**: package was copied to the local theme library;
- **active**: the runtime reports the expected theme ID;
- **verified**: real Codex screenshots passed route-specific checks and visual review.

### Theme Compiler

The compiler converts a declarative theme source into a runtime payload. AI does not inject arbitrary JavaScript and does not write unrestricted selectors into an installed theme.

The compiler accepts:

- design tokens and typography roles;
- native surface recipes;
- layout density and radius choices;
- art placement and route-specific masks;
- approved decoration components;
- approved motion components;
- local image assets and metadata.

It rejects unknown capabilities, invalid assets, unsafe paths, unreadable required color pairs, and unsupported schema versions.

### macOS Runtime

The existing Codex Dream Skin CDP injection mechanism remains the foundation. The runtime maps the compiled payload to stable root attributes, CSS custom properties, and runtime-owned decoration nodes.

Runtime responsibilities:

- style supported native Codex surfaces without replacing their real content;
- render decorations in a dedicated non-interactive layer;
- use separate home and task presentation rules;
- observe route and shell changes and reapply the active profile;
- detect missing critical selectors after Codex updates;
- stop or downgrade incompatible capabilities instead of leaving broken UI;
- respect `prefers-reduced-motion`;
- restore the original runtime and appearance.

### Visual QA

Deterministic QA checks image dimensions, payload validity, contrast targets, missing selectors, active theme identity, viewport coverage, and decoration hit-testing. Browser/CDP capture provides real home and task screenshots for visual review.

The repair loop is limited to two automatic passes in the first release. A failure after two passes is reported honestly with the screenshots and failed checks; it is not labeled verified.

## Theme Package Contract

Each generated theme is self-contained:

```text
theme-<slug>/
|-- theme.json
|-- background.webp
|-- ui-profile.json
|-- motion-profile.json
|-- decorations/
|-- preview-home.png
|-- preview-task.png
|-- README.md
`-- provenance.json
```

`theme.json` is the manifest and references only files inside the package. `provenance.json` records whether assets were generated, supplied by the user, or derived locally. Preview files are evidence and documentation; they are never injected as backgrounds.

## UI Profile

The first schema supports complete styling for these native areas:

- application shell and route background;
- left sidebar and sidebar resize region;
- navigation, project, task, and chat rows;
- selected, hover, focus, unread, and muted states;
- new-chat heading and supporting text;
- suggestion cards and their nested labels and icons;
- project selector;
- composer, permission control, model control, and send button;
- task transcript surfaces, code blocks, tool results, and sticky composer;
- popovers, menus, dialogs, and tooltips where selectors are reliable.

Profiles use named recipes such as `glass`, `solid`, `outline`, `telemetry`, and `editorial`, combined with validated tokens. Recipe names describe bounded rendering behavior rather than fixed color themes.

Themes may use a different surface recipe or opacity on the home and task routes. This prevents the existing-task view from hiding the background under a generic white layer while preserving long-form readability.

## Decorations And Motion

Complete creation mode permits optional runtime-owned visual components, including a theme masthead, status strip, corner detail, framing marks, ambient particles, light sweeps, rain, petals, or telemetry elements.

Safety rules are mandatory:

- decoration layers use `pointer-events: none`;
- no decoration may modify or imitate real project, task, permission, or account data;
- no decorative text is placed inside native interactive controls;
- decorations stay inside declared slots and responsive bounds;
- animations are restrained in task routes and disabled for reduced motion;
- every motion profile has a static fallback;
- arbitrary third-party scripts, remote assets, and network calls are forbidden.

## Compatibility Strategy

Codex Desktop DOM and class names may change. The runtime therefore maintains a versioned selector adapter separate from theme packages. Themes target semantic capabilities such as `sidebar.item.active`, not raw application selectors.

On activation, the runtime performs a compatibility probe. Missing optional surfaces cause a capability downgrade. Missing critical surfaces cause activation to fail safely and preserve the previous working theme. Compatibility results appear in the verification report.

## Installation And Distribution

The repository provides:

- a one-command macOS installer for the Skill and runtime;
- an uninstall and restore command;
- a prompt users can send to Codex to perform installation;
- a command to validate, install, switch, and export themes;
- shareable packages that do not require the recipient to own the creator's source references;
- example themes with real new-chat and task previews.

The README must state that the project is unofficial and that injection depends on local Codex implementation details. Public themes must use assets the author is allowed to redistribute.

## MVP Scope

The first release is macOS-only and proves one flagship GT theme end to end. It includes:

- installable Theme Creator Skill;
- schema v2 for UI, decoration, motion, art, and route policies;
- compiler and package validator;
- complete GT UI profile applied to the current Porsche background;
- real new-chat and existing-task verification;
- package export and restore path;
- tests for compiler validation, runtime mapping, interaction safety, route behavior, and compatibility failure.

The first release does not include a visual web editor, Windows support, arbitrary user CSS/JavaScript, a hosted marketplace, accounts, cloud storage, or automatic publishing to GitHub.

## Acceptance Criteria

The MVP is complete only when all of the following are true:

1. A fresh user can install the Skill and runtime by following the README or by sending the documented installation prompt to Codex.
2. A text-only request and a request with a local reference image both produce valid theme packages.
3. The flagship theme visibly changes the sidebar, native states, new-chat cards, project selector, composer, and task surfaces, not only the background.
4. Decorations cannot intercept clicks, cover required native text, or impersonate application data.
5. Required text and control states meet the project's declared contrast checks.
6. The active theme ID and runtime compatibility probe are verified after switching.
7. Real screenshots exist for both the new-chat and existing-task routes and are included in the exported package.
8. Reduced-motion mode has no continuous decorative animation.
9. A failed or incompatible activation preserves or restores the previous usable state.
10. The complete automated test suite passes and the final report distinguishes created, installed, active, and verified states.

## Implementation Order

1. Define schema v2 and compiler validation.
2. Add semantic UI capabilities and runtime selector adapter.
3. Build the flagship GT UI, decoration, and route profiles using test-first changes.
4. Add compatibility probing and deterministic QA.
5. Package the Theme Creator Skill around the proven scripts.
6. Add installation, export, examples, and public documentation.
7. Run the end-to-end creation and real Codex verification workflow.
