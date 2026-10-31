# SpeakEasy

A minimal Electron speech-practice app. Enter age and gender, read one passage, review the score and underlined results, then continue into endless adaptive practice.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run models
npm run models:speech
npm start
```

Model setup downloads MediaPipe Face Landmarker and quantized Whisper tiny.en weights once. Audio, video, transcription, and inference remain on this device. No API key is required. macOS may ask for camera and microphone permission.

## Flow

- **About you:** age and gender, saved on this device, never used to grade speech.
- **Reading:** one general passage covering several sounds. Recognized words highlight as you speak, with a live word count and progress bar. A three-second silence after speech begins ends recording automatically; a manual finish remains available. Fifteen seconds without speech prompts a microphone check. A small mirror follows and zooms in on the lips using MediaPipe landmarks.
- **Diagnostic results:** a prominent script-match score, the underlined passage, and issue-specific practice suggestions appear automatically after analysis. Select a suggestion or Start practice.
- **Continuous practice:** one prompt at a time. A small focus selector switches issues. Drill recordings also finish after three seconds of silence. “Review your reading” expands underlined transcript differences in the same workspace. The mirror stays available during drills.
- **Adaptive attempts:** recorded attempts are transcribed locally and compared with the current prompt. Two passes increase difficulty; a retry reduces it. Prompts keep rotating at the highest level. Volume practice additionally checks recorded level; pacing observations do not grade pauses as inherently wrong. If transcription fails, playback and self-review remain available.
- **New diagnostic:** available from practice, including while recording or analyzing. Cancels pending analysis, returns to the passage, and retains the progress profile.
- **Progress:** the profile icon opens diagnostic score history, per-focus attempt counts, latest transcript-match scores, and current difficulty. Data is saved in local storage; recordings remain in memory only.

## Analysis and limits

Whisper runs in an Electron worker thread. Word alignment identifies substitutions, omitted words, and additions. **Script match** is `100 × max(0, 1 − word error rate)`. It measures transcript agreement, not pronunciation accuracy or clinical improvement.

The general check observes words heard differently, words not heard, pauses over 0.7 seconds, fillers, repeated word pairs, and low recorded volume. Recognition errors and noise can produce flags; pauses may be natural, and microphone distance affects volume. Fillers and repetitions reflect recognizer output and may be normalized away by Whisper.

**Not implemented:** reliable lisp/articulation detection, diagnosis of speech conditions, phoneme alignment, or calibrated loudness. MediaPipe's lip outline is a visual guide, not a tongue-position assessment. Sample results are explicitly labeled and do not add a diagnostic to the profile.

## Verification

```sh
npm run build
npm test
npm run dev
```

The localhost browser preview supports the UI, recording, and mirror. Local transcription uses Electron's restricted preload bridge and therefore needs `npm start`.

`npm run test:speech -- /path/to/mono-16khz-pcm16.wav` exercises the actual local model against a WAV fixture. `npm run package` creates an unsigned macOS app directory.

The older `docs/`, `IMPLEMENTATION_PLAN.md`, and `DEVELOPMENT_STATUS.md` describe a previous Tauri/Python concept whose application source was not included in this checkout. Their claims do not apply to this Electron app.

Sources: [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js), [Transformers.js](https://huggingface.co/docs/transformers.js), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

Live reading progress uses local Whisper snapshots about every three seconds when the worker is available. It follows recognized words and may lag on slower computers; it never estimates progress from a timer. Audio capture and silence detection use an AudioWorklet. `scripts/test-reading-flow.cjs` exercises the real renderer, preload bridge, model, live progress, silence endpoint, score, and transition to practice with a generated in-memory stream. It uses a mono 16 kHz PCM16 WAV fixture at `/private/tmp/speakeasy-read-progress.wav`.
