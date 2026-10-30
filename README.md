# SpeakWell

Private, offline speech practice for the desktop: articulation and speech-therapy exercises, an enunciation lab, a
public-speaking studio, and a simulated conversation partner. Everything you record is analysed and stored on your own
computer.

SpeakWell combines what you **say** (acoustic analysis) with what your mouth visibly **does** (webcam face landmarks).
It is explicit about the limits of both. It never scores "pronunciation accuracy", and it never diagnoses. It says
plainly when something can't be measured, such as tongue position, which a camera cannot see.

![Dashboard and analysis](docs/screenshots/montage-a.png)

## What's inside

| Part | Technology | Location |
|---|---|---|
| Desktop shell | Tauri 2 (Rust): starts the engine as a sidecar, passes a per-launch token | `src-tauri/` |
| Interface | React 19 + TypeScript, plain CSS design tokens, Vite build | `frontend/` |
| Analysis engine | Python 3.10+ with numpy/scipy, stdlib HTTP server and SQLite | `python/speakwell/` |
| Content | 112 exercises (10 sounds × 7 stages, 27 enunciation drills, 15 public-speaking tasks), 10 conversation scenarios × 4 levels | `python/speakwell/content/` |

The modules are Speech therapy, Public speaking, the Enunciation lab, the Conversation studio, the Exercise library,
Progress, Recordings and Settings.

## Status

Read **[DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)** before relying on anything. In short:

* **Tested:** the analysis engine and API (61 unit and integration tests) and the full UI flow in headless Chromium,
  with a synthetic microphone and zero console errors.
* **Written but not compiled:** the Tauri/Rust shell. The development sandbox had no Rust toolchain and no
  Windows/macOS host, so no installer has been built yet.

## Quick start (development)

```bash
scripts/setup/setup_dev.sh            # Windows: scripts\setup\setup_dev.ps1   (needs internet once)
SPEAKWELL_DEV_PYTHON=$(pwd)/.venv/bin/python npm run dev   # Tauri window + Vite + engine from source
```

Run the engine on its own, without the desktop shell:

```bash
cd python
python -m speakwell selftest
python -m speakwell serve --port 8765 --token dev-token --data-dir ./.dev-data
python -m speakwell analyze my-recording.wav --exercise ps.read.news
```

To use the UI in a browser against that engine, run `npm --prefix frontend run dev` and open
`http://localhost:5173/?engine=http://127.0.0.1:8765&token=dev-token`.

## Building installers

```bash
scripts/package/build_app.sh          # macOS (.app/.dmg) or Linux
scripts\package\build_app.ps1         # Windows (.msi, NSIS .exe)
```

These scripts build the engine with PyInstaller into `src-tauri/binaries/`, build the UI, then run `tauri build`.
`.github/workflows/build.yml` runs the same steps on Windows and macOS (Intel and Apple Silicon). Code signing and
notarisation are not configured yet.

## Optional capabilities

| Feature | Needs | How |
|---|---|---|
| Words per minute from a transcript, filler words, content feedback | Local Whisper model | `python scripts/setup/download_models.py --asr small.en`, then Settings › Speech recognition |
| Lip and face measurements | MediaPipe face model (Apache-2.0, 3.6 MB) | `npm --prefix frontend run fetch-face-model` (done by setup), then Settings › Camera |
| Richer conversation follow-ups | Ollama or another OpenAI-compatible server on this computer | Settings › Local language model (loopback addresses only) |

Without them, SpeakWell still measures pace (from syllables), pauses, pitch, loudness and the sound-specific acoustic
cues, and labels what it couldn't measure.

## Documentation

* [Architecture](docs/ARCHITECTURE.md)
* [Analysis methods and limitations](docs/ANALYSIS_METHODS.md)
* [Models, datasets and licences](docs/MODELS.md)
* [Privacy](docs/PRIVACY.md)
* [Testing](docs/TESTING.md)

SpeakWell is a practice tool. It does not diagnose speech conditions and does not replace a speech-language
pathologist.
