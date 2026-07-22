# Product Video Voiceover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and verify a standalone Mandarin male voiceover for the existing 36.2-second Codex Theme Creator video.

**Architecture:** Generate each approved sentence as an isolated speech clip, normalize and trim it, then place clips on a fixed 36.2-second timeline with deliberate pauses. Export one editing-quality WAV and one compact MP3 without BGM.

**Tech Stack:** Edge TTS or the best available local Mandarin neural voice, FFmpeg, ffprobe.

---

### Task 1: Generate sentence clips

**Files:**
- Create: `video/codex-theme-creator-promo/voiceover/script.txt`
- Create: `video/codex-theme-creator-promo/voiceover/clips/*.mp3`

- [ ] Write the nine approved lines to `script.txt` with stable numeric IDs.
- [ ] Query installed Mandarin voices and select a young, steady male voice.
- [ ] Generate one clip per line so timing can be adjusted without regenerating the whole take.
- [ ] Verify all nine clips exist and decode successfully with `ffprobe`.

### Task 2: Build the timed voiceover

**Files:**
- Create: `video/codex-theme-creator-promo/voiceover/timeline.txt`
- Create: `video/codex-theme-creator-promo/out/codex-theme-creator-voiceover.wav`
- Create: `video/codex-theme-creator-promo/out/codex-theme-creator-voiceover.mp3`

- [ ] Trim leading and trailing silence from every generated clip.
- [ ] Place clips against the existing shot structure, keeping title cards and the final brand hold readable.
- [ ] Normalize the assembled voiceover and limit true peak below -1 dBFS.
- [ ] Export 48 kHz mono WAV and 192 kbps MP3.

### Task 3: Verify delivery assets

**Files:**
- Create: `video/codex-theme-creator-promo/out/qa/voiceover-report.txt`

- [ ] Use `ffprobe` to confirm codec, sample rate, channel count, and duration.
- [ ] Use `ebur128` to measure integrated loudness and peak level.
- [ ] Confirm the track contains no BGM and ends within 36.2 seconds.
- [ ] Record checksums and measured values in the QA report.
