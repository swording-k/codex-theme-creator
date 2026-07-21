# Public Release and Windows Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic debugging and test-driven development task-by-task.

**Goal:** Deliver trusted macOS distribution, a real Windows desktop build, feedback, and observable downloads.

**Architecture:** Keep themes, UI, archives, and injection shared. Add small platform adapters for installation, launch, switching, restore, and packaging. Use GitHub Releases as the binary and download-count source.

**Tech Stack:** Electron, Node.js ESM, PowerShell, NSIS, GitHub Pages, GitHub Releases API.

---

### Task 1: macOS release trust

- [ ] Reproduce Gatekeeper rejection on the released DMG.
- [ ] Verify nested signing and hardened runtime.
- [ ] Configure notarization credentials, notarize, staple, reassess, and replace the release asset.

### Task 2: shared platform contract

- [ ] Write failing tests for Windows platform commands and creator paths.
- [ ] Add command descriptors and cross-platform creator provisioning.
- [ ] Keep all existing macOS tests green.

### Task 3: Windows runtime

- [ ] Write failing tests for executable discovery, CDP startup, state safety, switching, and restore.
- [ ] Implement PowerShell process adapter and shared Node runtime controller.
- [ ] Verify theme switching against a real Windows ChatGPT/Codex process.

### Task 4: Windows desktop distribution

- [ ] Add Windows icon, NSIS target, install/uninstall metadata, and artifact naming.
- [ ] Cross-build x64 and arm64 installers.
- [ ] Install and exercise the complete workflow in Windows 11.

### Task 5: feedback and measurement

- [ ] Write UI contract tests for feedback links and download count.
- [ ] Add App/website feedback actions and GitHub Release download aggregation.
- [ ] Verify live Pages rendering and issue template behavior.

### Task 6: final release audit

- [ ] Run all unit, integration, packaging, and platform checks.
- [ ] Update README and website with only verified platform claims.
- [ ] Publish trusted macOS and verified Windows artifacts.
