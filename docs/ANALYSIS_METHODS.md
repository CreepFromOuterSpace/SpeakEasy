# Analysis methods and limitations

Every number SpeakWell shows is a `Measurement` with a confidence (high, medium or low), what it measures, and when it
is meaningful. When something can't be measured reliably, the app says so instead of estimating it.

| Measurement | Method | Validated here with | Main limitations |
|---|---|---|---|
| Speech / pauses | Adaptive dual-threshold energy VAD (5th/97th percentile floor and peak, hysteresis); silent pauses ≥ 0.25 s | Synthetic bursts: pause durations within ±50 ms | Background noise hides short pauses. There's a fallback for continuous sound with no silence. |
| Pitch (F0) | YIN (de Cheveigné & Kawahara 2002), FFT difference function, octave-jump cleaning | Harmonic tones 95–320 Hz within 1.5%; glides | Creaky or breathy voice and noise reduce voicing detection. Variation is reported in semitones. |
| Speaking rate | Syllable nuclei after de Jong & Wempe (2009): vowel-band intensity peaks, 2 dB dip, voiced | Synthetic syllables within 10% | Automatic counts differ from hand counts by roughly 10–20%. Words per minute without ASR assume 1.5 syllables per word and are labelled estimates. |
| Loudness | dBFS frame energy, phrase-level spread, trailing-off detection, SNR, clipping | Synthetic levels and clipping | Relative only: there's no microphone calibration. Comparisons across sessions are valid only with the same setup. |
| Fricative cue (S, SH, CH) | Spectral centre of gravity, focus (1 − flatness), rise time over the longest hiss | Band-limited noise for S and SH | Values vary by speaker, microphone and sample rate. Assessed only at the sound and syllable stages. |
| Rhotic cue (R) | LPC formant F3 (lowest stable value) | LPC accuracy on synthetic vowels | Depends on vocal-tract size. Accent notes are built in. |
| Vowel cue | LPC F1/F2, autocorrelation method, order 12 | F2/F3 within 2%; F1 of /i/ +10–20% | **Known LPC bias:** F1 of close vowels is overestimated when harmonics are sparse (higher voices). |
| Stops (K, G) | VOT: burst (HF rise ≥ 12 dB / 3 ms after ≥ 30 ms closure) to onset of LF-dominant voicing | Synthetic 15–100 ms within about 3 ms | Real releases are messier than synthetic ones. Short-lag VOT is reported as an accent feature, not an error. |
| Voice quality | HNR (Boersma 1993 window-corrected autocorrelation), CPP (Hillenbrand 1994) | Noise lowers both | Sustained vowels only. Not comparable with Praat or clinical norms. Jitter and shimmer need the optional Parselmouth backend. |
| Fillers / repetitions | Transcript tokens; "like" or "you know" only when set off by punctuation | Unit tests | Whisper often omits fillers, so counts are lower bounds. |
| Visible articulation | Landmarks normalised by outer-eye distance: lip aperture, width vs relaxed, blendshape rounding, corner asymmetry (frontal frames) | Synthetic face geometry | The camera can't see the tongue, teeth or vocal folds. Lip shape alone never establishes which sound was made. |
| Facing camera / look-aways | Nose-to-cheek yaw proxy, pitch ratio, iris position relative to eye corners | Synthetic yaw | A geometric proxy, not eye tracking. |
| AV timing | Cross-correlation of lip aperture with the intensity envelope (±0.5 s) | Recovers a 120 ms offset within 15 ms | Includes natural anticipatory lip movement. |
| Script analysis | Sentence length, Flesch, wordy-phrase list, signposting, opening and closing heuristics | Unit tests | Heuristics flag places to look at; they can't judge ideas. |

## What SpeakWell deliberately does not do

* **Score pronunciation accuracy.** Recognising a word is not judging how it was pronounced. Reading exercises show
  "words the recogniser heard differently" to listen back to, never a score.
* **Infer confidence, charisma, intelligence or personality** from voice or face.
* **Diagnose.** The progression engine uses your own rating after listening back. An acoustic cue can only hold back
  a "clear" rating, never create one.
* **Treat accents as errors.** R after vowels, TH realised as F/V/T/D, and short-lag stops are all described as
  normal accent features.

## Feedback thresholds

Pace targets depend on the speaking style you choose, and you can override them:

* Conversational: 130–170 wpm
* Measured: 110–145 wpm
* Energetic: 140–180 wpm
* Formal: 115–150 wpm
* Storytelling: 120–165 wpm
* Clarity practice: 100–140 wpm

These are approximate norms, not rules. Pitch-variation suggestions use a style-dependent minimum of 1.2–2.3
semitones, and note that a steadier voice suits some styles and languages.
