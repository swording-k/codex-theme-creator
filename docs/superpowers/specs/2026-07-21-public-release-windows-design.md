# Public Release and Windows Runtime Design

## Goal

Ship a usable macOS public beta without the Gatekeeper malware warning, add a functionally equivalent Windows app, and provide feedback plus measurable distribution data.

## Release trust

The macOS app uses Developer ID Application signing, hardened runtime, notarization, and stapling. Public release is blocked unless `codesign`, `notarytool`, `stapler`, and `spctl` all pass on the exact uploaded artifact. The Windows installer uses NSIS and is verified in a Windows 11 VM; code signing is added when a Windows signing certificate is available.

## Cross-platform runtime

Theme packages, Theme Studio, archives, the renderer payload, and the CDP injector remain shared. Platform adapters own only process discovery, launch, state, and restore:

- macOS keeps the existing hardened shell runtime.
- Windows uses PowerShell to discover the Store or desktop ChatGPT/Codex executable, relaunch it with a loopback-only CDP port, and start the shared injector using Electron's bundled Node runtime.
- Runtime state is stored under the platform data root and contains the selected port and injector PID.
- Restore stops only the recorded injector, removes the injected DOM/CSS, and leaves the user's themes intact.

## Creator Skill

The desktop app copies the bundled `codex-theme-creator` Skill to the user's `.codex/skills` directory on first launch on both platforms. The platform-specific engine is copied beside it. The UI reports ready only after both files exist.

## Feedback and analytics

The App and website expose a clear feedback action that opens a prefilled GitHub issue. The website displays aggregate GitHub Release download counts from the public Releases API. GitHub repository traffic remains available to the owner under Insights; no hidden user telemetry is added.

## Verification

- macOS: clean-install DMG, Gatekeeper assessment, launch, Skill provisioning, theme switch, restore.
- Windows: installer install/uninstall, tray presence, Skill provisioning, theme import/export, theme switch, persistence after navigation, restore, and relaunch.
- Website: live download links, Windows status, feedback link, and release count rendering.

## Product boundaries

The product is unofficial and does not modify ChatGPT/Codex application files. If OpenAI changes renderer selectors or disables the local debugging channel, compatibility can degrade and must be reported rather than hidden.
