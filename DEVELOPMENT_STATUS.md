# Development status

_Last updated at the end of the third build session. The environment was Ubuntu 24.04 x86_64 with 1 CPU, no GPU, no
network, no Rust toolchain and no Windows or macOS host._

## Milestones

| Milestone | State | Evidence |
|---|---|---|
| 1. Desktop foundation | **Engine, storage and UI working; Tauri shell written but not compiled** | API integration tests, including persistence across restarts; e2e UI test |
| 2. Audio analysis | **Working** | 20 DSP tests against synthetic ground truth |
| 3. Public speaking and enunciation | **Working**; transcript features need an optional ASR model | e2e records and analyses a reading; script analysis tested |
| 4. Computer vision | **Measurement maths working; live tracking untested** | Vision tests; the MediaPipe JS hook was written against its API, but no model file was available offline |
| 5. Multimodal therapy | **Working** | e2e therapy attempt with rating; API test of rating → advance → stage change |
| 6. Conversation studio | **Working (rule-based)**; local LLM path untested | API test of debate counter-argument follow-up; e2e starts an interview |
| 7. Packaging | **Scripts and CI written, not run** | No Rust or PyInstaller in the sandbox; no Windows or macOS host |

## Tests that were actually executed

* `python -m unittest discover -s tests -t .` (in `python/`): **61 run, 61 pass.**
* `python -m speakwell selftest`: **OK**.
* `python scripts/e2e/run_e2e.py`: **10 of 10 steps pass, 0 console errors, 0 page errors, 0 engine errors.**
  Screenshots are in `docs/screenshots/`.
* TypeScript ran in a loose mode, because React types weren't installable offline: **no errors** apart from
  `key`-prop false positives, which come from the missing `@types/react`.
* An esbuild bundle of the full UI was produced: **succeeded**.

## Written but not executed here

* The Tauri 2 Rust shell (`src-tauri/`), PyInstaller sidecar build, installers, and the CI workflow.
* `npm install` and the Vite build. The dependency versions in `frontend/package.json` were chosen but never resolved
  from the registry; the `@fontsource` package names in particular need confirming on first install.
* MediaPipe face tracking in the web view, faster-whisper and whisper.cpp backends, the Ollama and OpenAI-compatible
  clients, and the Parselmouth path.
* Real microphones, cameras and voices. All tests used synthetic signals.

## Known limitations

* Without a speech-recognition model, words per minute are estimated from syllables and labelled as estimates.
  Filler words, script alignment and structure feedback are unavailable and say so.
* LPC overestimates F1 of close vowels for higher voices by 10–20%.
* Analysis runs synchronously per request. Very long presentations with ASR may take a while; there's no job queue
  yet.
* There is no encryption at rest, and no posture or gesture analysis (needs a body-pose model).

## Next steps (in order)

1. On a developer machine: `scripts/setup/setup_dev.sh`, then `SPEAKWELL_DEV_PYTHON=… npm run dev`. Fix any
   compile errors in `src-tauri/`.
2. Confirm getUserMedia permission prompts on Windows (WebView2) and macOS (WKWebView), and the MediaPipe WASM
   loading under the Tauri CSP.
3. Build installers on each platform (`scripts/package/build_app.*`) and run the manual checklist in
   `docs/TESTING.md`.
4. Validate measurements on real recordings: compare syllable rate with hand counts, and pitch and formants with Praat.
5. Add an async analysis job queue for long recordings, code signing and notarisation, and an optional phoneme model.
