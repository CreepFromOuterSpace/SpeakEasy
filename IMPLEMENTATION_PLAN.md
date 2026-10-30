# SpeakWell — Implementation Plan

## Environment findings (first execution, sandbox)

| Item | Finding | Consequence |
|---|---|---|
| OS / HW | Ubuntu 24.04 x86_64, 1 vCPU, 3.9 GB RAM, no GPU | All inference CPU-only; analysis code must be light |
| Network | Disabled | No package installs; no model downloads |
| Python | 3.12, numpy, scipy, OpenCV, MediaPipe 0.10.33 (no `.task` models), ffmpeg | Engine built on numpy/scipy only; librosa/Parselmouth optional backends |
| Node | 22 + global React 19, react-icons 5.6, TypeScript 6, esbuild (via tsx), Playwright Chromium 141 | UI can be bundled and driven end-to-end in headless Chromium with a fake microphone |
| Missing | Rust/Cargo, Tailwind, Vite, MediaPipe Tasks JS, faster-whisper, pytest | See decisions below |

## Architecture

```
React UI (webview)  ──HTTP/JSON, bearer token, 127.0.0.1──►  Python engine (Tauri sidecar)
   │ getUserMedia (mic, camera)                                   │ audio DSP · ASR backends · vision metrics
   │ MediaPipe Face Landmarker (WASM, in webview)                 │ feedback · progression · SQLite
   └── Tauri 2 shell (Rust): spawns engine, passes port+token, kills it on exit
```

* **Engine** (`python/speakwell`): stdlib HTTP server, SQLite (stdlib `sqlite3`), numpy/scipy DSP.
  Optional, pluggable backends: faster-whisper, whisper.cpp CLI, Parselmouth, Ollama /
  OpenAI-compatible *local* LLM servers, MediaPipe (Python) for offline video.
* **Vision split**: live landmark detection runs in the webview (MediaPipe Tasks WASM, smooth preview);
  only a small landmark subset is sent to the engine, where all measurement math lives (tested once,
  in Python). The Python MediaPipe backend produces the same payload from video files.
* **Content** ships inside the engine package (`speakwell/content`) so the sidecar is self-contained;
  users can drop extra JSON packs into `<data dir>/exercise-packs/` without code changes.

## Decisions and deviations (documented, justified)

1. **Plain CSS design tokens instead of Tailwind.** Tailwind could not be installed offline; hand-written
   tokens let the UI be compiled and screenshot-verified here. Tailwind can be adopted later without
   architectural change.
2. **Tiny hash router instead of react-router** (one less dependency; Tauri-friendly).
3. **Stdlib HTTP server instead of FastAPI** (smaller PyInstaller bundle, fully testable offline).
4. **unittest instead of pytest** (pytest unavailable; tests are pytest-compatible).
5. **No Parselmouth/openSMILE by default**: Parselmouth is GPL-3.0 and openSMILE's licence restricts
   commercial use; both are optional, user-installed backends.
6. **Pronunciation honesty**: transcript matching is reported as "recognizer heard", never as
   pronunciation accuracy. Acoustic cues are only computed where a published acoustic correlate exists
   (sibilant spectral centre of gravity, rhotic F3, vowel F1/F2, stop VOT) and only at the
   isolation/syllable stages where the target sound can be isolated without phoneme alignment.

## Milestones

| # | Milestone | Plan in this environment |
|---|---|---|
| 1 | Desktop foundation | Engine API + SQLite + recording storage (tested); React UI (bundled, e2e-tested in Chromium); Tauri shell (written, **not compiled** — no Rust) |
| 2 | Audio analysis | VAD, pauses, YIN pitch, loudness, syllable-nuclei rate, spectrogram, LPC formants, HNR/CPP, VOT; ASR backend interface (tested with synthetic signals) |
| 3 | Public speaking & enunciation | Exercise packs, challenges with timers, presentation coach, timeline feedback, script analysis, comparisons |
| 4 | Computer vision | Webcam capture + MediaPipe WASM tracking in UI; Python mouth metrics, AV sync, look-away events, reference comparison (math tested; live tracking untestable here — no model file) |
| 5 | Multimodal therapy | Sound packs (R, S, L, TH, SH, CH, K, G, vowels) × 7 stages, cue fusion, self-rating, transparent progression |
| 6 | Conversation studio | 10 scenarios × 4 difficulties, rule-based follow-ups, optional loopback-only local LLM |
| 7 | Packaging | PyInstaller sidecar script, Tauri bundle config, CI matrix for Windows/macOS (written, **untested** here) |

Progress is tracked in `DEVELOPMENT_STATUS.md`.
