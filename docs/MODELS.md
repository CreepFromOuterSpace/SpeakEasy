# Models, datasets and licences

The licences below are as published by each project when this was written. **Re-check every licence before you
bundle or distribute anything.** No model ships inside SpeakWell by default, and nothing downloads without the user
asking.

## Models SpeakWell can use

| Model | Purpose | Licence | Size | Hardware | Limitations |
|---|---|---|---|---|---|
| Whisper via faster-whisper (`Systran/faster-whisper-*`) | Transcripts, wpm, fillers | MIT (code and OpenAI weights) | base.en ≈ 145 MB, small.en ≈ 485 MB | CPU int8 is fine; 2–4 GB RAM | Omits fillers; accent and noise sensitivity; not a pronunciation judge |
| whisper.cpp (ggml models) | Alternative ASR | MIT | ≈ 148 MB (base.en) | CPU; Metal or CUDA optional | Approximate word timing |
| MediaPipe Face Landmarker | Lip and face landmarks in the UI | Apache-2.0 | ≈ 3.6 MB | WebAssembly (GPU if available) | Lighting, glare, beards and turned heads reduce accuracy; blendshapes are learned estimates |
| Ollama or any OpenAI-compatible local server | Phrasing conversation follow-ups | Depends on the model you choose | 1–8 GB | 8 GB+ RAM | Can be off-topic; never used to grade |
| Parselmouth (Praat) | Jitter and shimmer (optional) | **GPL-3.0**: bundling it changes how the app may be distributed | ≈ 30 MB | CPU | Not installed by default |
| openSMILE | Not used | Custom licence: free for research and personal use; commercial use requires a licence from audEERING | — | — | Excluded for licence reasons |

## Visual speech recognition (future)

* **VALLR (2025)** is a two-stage design: visual phoneme recognition followed by a language model. Check whether code
  and weights are published and under what licence.
* **Auto-AVSR** and **AV-HuBERT** are also candidates. AV-HuBERT is under a non-commercial research licence.
  Weights trained on LRS3 inherit the dataset's terms.
* SpeakWell's `VisualSpeechRecognizer` interface is ready for these. No lip-reading model is shipped or trained.

## Datasets (investigated, not downloaded)

| Dataset | Access | Commercial use |
|---|---|---|
| Speech Accessibility Project (UIUC) | By application under a data-use agreement | Governed by the agreement; review before any use |
| UA-Speech (dysarthric speech) | On request for research | Assume not permitted without permission |
| LRS3 (TED-based lip reading) | Research licence | TED content is CC BY-NC-ND; assume non-commercial |
| AphasiaBank (TalkBank) | Membership and ground rules for researchers and clinicians | Restricted |
| Mozilla Common Voice | Open download | CC0 |
| LibriSpeech | Open download | CC BY 4.0 |
| speechocean762 (L2 pronunciation scores) | Open download (OpenSLR) | Check the licence on OpenSLR |

No model was trained for this MVP. "Publicly accessible" does not mean "commercially usable".
