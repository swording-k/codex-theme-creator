# Apex Motion Runtime Design

## Goal

Extend Codex Dream Skin with reusable, theme-configured motion and route-specific surfaces. The first flagship is a GT broadcast theme; rain forest and alpine lake themes will reuse the same runtime contract.

## Product Contract

- The Codex home route is the visual showcase: full-window art, readable native suggestion cards, subtle motion, and a compact non-interactive status overlay.
- Existing chats are the work route: background remains visible around content, while messages and the composer receive stable dark surfaces.
- Native Codex controls remain interactive. Decorative layers use `pointer-events: none` and never replace user content.
- Motion stops under `prefers-reduced-motion: reduce`.

## Theme Schema

Themes may add a `motion` object:

```json
{
  "motion": {
    "profile": "gt-broadcast",
    "intensity": 0.65,
    "rain": true,
    "signalLights": true,
    "telemetry": true
  }
}
```

The runtime validates profile names and clamps intensity to `0..1`. Unknown or missing values resolve to the static `none` profile.

## Runtime Architecture

`renderer-inject.js` maps the motion configuration to stable root attributes and CSS variables. It creates one decorative motion layer inside the existing Dream Skin chrome. `dream-skin.css` renders profile-specific effects using CSS gradients, pseudo-elements, and keyframes.

The GT profile provides diagonal rain, start-light pulses, a restrained timing strip, and a telemetry sweep. Home suggestion cards force explicit foreground inheritance so nested native labels cannot retain stale black tokens. Task routes use dark local message surfaces instead of a full-window white wash.

## Distribution

The repository vendors the upstream macOS runtime under `engine/macos/`, preserving its license. `scripts/install-enhanced-runtime.sh` installs this enhanced runtime and seeds public themes. Private branded themes remain ignored and can be copied locally for personal testing.

## Verification

- Unit tests cover motion attribute mapping, defaults, cleanup, reduced-motion CSS, card foreground inheritance, and task-route surface rules.
- The complete upstream macOS test suite must pass.
- The enhanced runtime must install locally, validate the Porsche theme payload, hot-switch to it, and report the active theme ID.
- Final visual acceptance happens in the real Codex home route and an existing task, not only in a mockup.
