# SpeakEasy

An Electron speech-practice demo with a private live mirror, MediaPipe mouth outlines, a reading check-in, and adaptive drills inspired by Learn mode.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run models
npm run models:speech
npm start
```

The model setup downloads Google's Face Landmarker model and copies MediaPipe's WASM runtime into `public/`. Both are bundled locally by the build. Recording and tracking do not upload audio or video. No API key is required. `models:speech` downloads quantized Whisper tiny.en weights from Hugging Face; transcription runs in a local worker thread inside Electron. The browser development preview cannot run the Electron speech bridge.

For browser development: `npm run dev` and visit the localhost address it prints. `npm run build` creates the renderer; `npm test` checks audio pause analysis and adaptive progression. `npm run package` creates an unsigned macOS application directory using electron-builder. macOS camera and microphone permissions may need to be enabled for Electron in System Settings.

## Demo flow (2–3 minutes)

1. Start at Speech check-in. Optional age range and gender stay in session memory and do not affect scoring.
2. Enable camera. After the local model loads, green contours follow the outer and inner lips. “Face not in view” means no face was detected; outlines are visual feedback only.
3. Start check-in and read the short, original passage. Click a sentence to move the reading guide. Finish after reading.
4. Review real duration, interior pauses over 0.7 seconds, microphone-dependent speaking level, and local playback. Whisper also transcribes your recording and aligns recognized words with the source passage, showing substitutions, omissions, additions, and matched-word counts. Select a flagged word to practice it. Recognition differences are not clinical scores.
5. Alternatively, choose **Explore a sample** to show explicitly illustrative word-level /s/ flags. Select an underlined word to open its practice queue.
6. Record a drill, listen back, and choose “Felt confident” or “Try an easier one.” Two confident reviews move up one of five stages; a retry lowers difficulty. Switch between sound, pacing, and clarity queues.
7. Your progress shows stages and reviewed attempts saved on this device. Reset removes local progress. Recordings remain in memory and disappear on quit.

## What is and isn't implemented

- Real webcam capture and on-device MediaPipe Face Landmarker lip contours.
- Real microphone recording, waveform, playback, pause counting, and mean speech-frame dBFS.
- Local Whisper transcription, word-level edit-distance alignment, transcript display, and drills drawn from flagged source words.
- Local self-review-based adaptive drills, text-to-speech prompts, and persistent progress.
- Permission and missing-model errors with a camera-free and microphone-free sample path.
- **Not implemented:** automated lisp recognition, phoneme alignment, automated mumbling detection, clinical diagnosis, verified improvement scores, or audio-based drill grading. Transcript alignment does not verify articulation: Whisper can recognize a word despite a distorted sound, or misrecognize a clearly spoken word. Sample word flags are labeled illustrative; real recordings receive transcript-difference flags rather than fabricated sound flags. Pause and volume cues cannot by themselves establish a speech disorder.

The older `docs/`, `IMPLEMENTATION_PLAN.md`, and `DEVELOPMENT_STATUS.md` describe a previous Tauri/Python concept whose source was not included in this checkout. Their implementation and testing claims do not apply to this Electron demo.

## Sources

- [MediaPipe Face Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

SpeakEasy supports practice and self-reflection. Assessment and individualized treatment belong with a speech-language pathologist.

Speech validation: `npm run test:speech -- /path/to/mono-16khz-pcm16.wav` runs the actual local model against a WAV fixture. Unit tests cover transcript alignment and its punctuation, insertion, omission, and substitution cases.
