# Architecture

```
┌──────────── Tauri 2 shell (Rust, src-tauri/) ────────────┐
│ picks a free 127.0.0.1 port + random token, spawns engine │
│ exposes engine_info / engine_restart / reveal commands    │
└──────┬──────────────────────────────────────┬────────────┘
       │ web view                              │ sidecar (stdin held open)
┌──────▼───────────────────────┐   HTTP/JSON  ┌▼──────────────────────────────┐
│ React UI (frontend/)          │ ───────────► │ Python engine (python/speakwell)│
│ AudioWorklet → 16-bit WAV     │  Bearer token│ api/      routes, service      │
│ getUserMedia camera (opt-in)  │  CORS allow- │ analysis/ orchestrator, timeline│
│ MediaPipe WASM landmarks      │  list, Host  │ audio/    VAD, YIN, LPC, rate…  │
│ (subset sent, never video)    │  check       │ speech/   ASR backends, fillers │
└───────────────────────────────┘              │ vision/   mouth metrics, sync  │
                                               │ database/ SQLite (WAL)         │
                                               └────────────────────────────────┘
```

## Data flow for one attempt

1. The **UI** records raw microphone audio, with browser AGC and noise suppression off by default, through an AudioWorklet.
2. If the camera is enabled, MediaPipe runs in the web view. It keeps 19 landmarks and 7 blendshape scores per frame,
   timestamped against the same clock as the audio.
3. The UI uploads the WAV (`POST /api/recordings`), then the landmark timeline (`PUT /recordings/{id}/visual`), then
   requests analysis (`POST /recordings/{id}/analyze`).
4. The **engine** runs isolated stages: quality and voice activity, pitch (YIN), rate (syllable nuclei), loudness,
   optional transcript, optional voice quality, visual, and exercise cues. It then builds timeline events and
   template feedback.
5. Results are stored in SQLite: `analysis_results`, plus one row per numeric measurement in `metric_history`, which
   drives the progress charts. For therapy exercises, the user's self-rating then feeds the progression engine.

## Engine layers

* `audio/` holds pure signal processing (numpy/scipy). It has no I/O and is unit-tested with synthetic ground truth.
* `speech/`, `vision/` and `analysis/` contain measurement logic. Every reported value is a `Measurement` with a
  confidence, an explanation and its conditions, or an explicit `not_assessed` or `unavailable` with a reason.
* `feedback/` is template-only: it turns measurements into supportive, evidence-linked advice, with no generative model.
* `exercises/` contains the pack loader, the transparent progression and the recommendations.
* `conversation/` contains question banks, rule-based follow-ups and the optional loopback-only LLM.
* `database/` holds the schema, with forward-only migrations, and the repository.
* `api/` contains the stdlib HTTP server (security checks), the route table and the application service.

## Extension points

| Add… | Implement | Register in |
|---|---|---|
| A speech recogniser | `ASRBackend` protocol (`speech/asr.py`) | `candidate_backends` |
| Phoneme-level assessment | `PhonemeAssessor` (`speech/pronunciation.py`) | analysis engine |
| Visual speech recognition (e.g. VALLR-style) | `VisualSpeechRecognizer` (`vision/backends.py`) | analysis engine |
| Exercises | JSON pack: `therapy-sound-pack/v1` or `exercise-list/v1` | drop into `<data dir>/exercise-packs/` |

## Deviations from the original brief (and why)

* **Plain CSS tokens instead of Tailwind.** Tailwind couldn't be installed offline. Hand-written tokens let the UI be
  compiled and screenshot-tested, and Tailwind can be adopted later without architectural change.
* **A stdlib HTTP server instead of FastAPI.** This means fewer dependencies, a smaller PyInstaller bundle, and
  testing without network access.
* **Exercise content ships inside the Python package.** This keeps the sidecar self-contained; user packs live in the
  data folder.
* **No `@tauri-apps/api` dependency.** The UI calls `window.__TAURI_INTERNALS__.invoke`, the call that package wraps
  in Tauri 2.
