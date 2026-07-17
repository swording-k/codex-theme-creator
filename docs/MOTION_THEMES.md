# Motion Theme Notes

Codex Dream Skin currently treats a theme as `theme.json` plus one image file. The supported image filenames are PNG, JPEG, and WebP. GIF and MP4 are not part of the current theme contract.

## What Might Work

Animated WebP may work as a CSS `background-image` in Chromium and can pass the broad filename rule if it stays under 16 MB and exposes valid WebP dimensions. This is not documented as an official Dream Skin feature, so it should be treated as experimental.

## Better Long-Term Approach

For effects such as continuous rain, the cleaner design is an injected, pointer-events-free CSS overlay:

- Rain streak layer over the wallpaper.
- Low opacity so Codex text remains readable.
- Disabled or reduced under `prefers-reduced-motion`.
- Theme-controlled fields such as `motion.type: "rain"` and `motion.intensity`.

This requires extending the Dream Skin engine or carrying a small local fork. It should not be mixed into ordinary static theme packs until the behavior is verified.

## Current Recommendation

Ship static themes first. For self-media demos, make a separate experimental branch or video showing motion rain after the static theme library is stable.
