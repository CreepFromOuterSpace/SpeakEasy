# Testing

## Automated

```bash
cd python && python -m unittest discover -s tests -t .   # 61 tests: DSP, vision, speech/text, engine, feedback,
                                                          # library/progression, database, HTTP API integration
python -m speakwell selftest
python scripts/e2e/run_e2e.py                             # UI end to end (Playwright + Chromium, fake microphone)
```

The end-to-end test:

1. Serves the bundled UI and starts the real engine.
2. Feeds a synthetic speech-like WAV in as the microphone.
3. Completes onboarding, then records and analyses a reading exercise.
4. Records a therapy attempt and rates it.
5. Analyses a script and starts a job interview.
6. Opens Progress, switches to dark mode and reopens a saved recording.

It fails on any browser console error or page error.

## Manual checklist (do this on each target platform)

| # | Check | Expected |
|---|---|---|
| 1 | Launch the installed app | Dashboard appears within about 5 s; onboarding shown on first run |
| 2 | Record a reading exercise | Sidebar microphone light is on; waveform, pitch chart, feedback and measurements appear |
| 3 | Play back; click a timestamp | Audio plays from that moment |
| 4 | Quit and relaunch | Recording listed under Recordings with its analysis |
| 5 | Turn the camera on; record a therapy SH attempt | Camera light on; lip outline overlay; lip-shape cue shown |
| 6 | Turn the camera off | Audio analysis still works; camera light off |
| 7 | Disconnect from the internet | Every feature except optional model downloads keeps working |
| 8 | Delete a recording; Export; Delete all | Files removed; export zip opens; app returns to onboarding |
| 9 | Kill the engine process | Boot screen reports it; Settings › About › Restart recovers |
