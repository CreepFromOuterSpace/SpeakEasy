# Privacy

* **Local by default.** Audio, landmark timelines, analyses and progress live in the platform data folder, for example
  `%APPDATA%\app.speakwell.desktop` or `~/Library/Application Support/app.speakwell.desktop`. On macOS and Linux the
  folder is created with owner-only permissions (0700).
* **No account, no cloud, no API keys.** The engine binds only to 127.0.0.1. Requests need a random per-launch token
  and an allow-listed origin, so websites open in a browser can't reach it.
* **Microphone and camera on request.** The microphone starts only when you press record. The camera is off until you
  enable it in Settings, and runs only on practice screens. The sidebar shows a lit indicator whenever either is active.
* **No video is stored.** Only 19 landmark positions and 7 blendshape scores per frame are kept, and you can switch
  that off.
* **Local model servers only.** Optional LLM servers must be on loopback addresses; others are rejected.
* **Offline voices.** Computer-voice demonstrations use the operating system's offline voices only.
* **Your control.** You can delete one recording (with its analysis and measurements), export everything as a zip,
  back up the database, or delete all data.
* **No training on your recordings.** Recordings are never used to train models. Any future option would need separate,
  explicit consent.
* **Not yet implemented:** encryption at rest. SpeakWell relies on OS account protection and full-disk encryption
  (BitLocker or FileVault). SQLCipher is a possible future option.
