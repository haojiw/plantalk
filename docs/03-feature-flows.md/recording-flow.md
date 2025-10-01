# Recording Flow

Scope: pressing plant → record → pause/resume → finish → save.

**Files**

* `app/record.tsx` — modal screen; owns UI and wires events to `useRecorder`.
* `components/Waveform.tsx` — renders live waveform + timer.
* `hooks/useRecorder.ts` — recording state machine + audio session management.

---

## UX: Happy Path (V1)

1. User taps **Plant → Mic** to start.
2. **Recording**: live waveform + timer; **Pause** and **Finish** visible.
3. **Pause/Resume** as needed (waveform freezes while paused).
4. Tap **Finish** → entry is created and saved; modal closes.
5. Journal shows a new entry with **Processing…** until transcription/refinement completes.

---

## State Machine (in `useRecorder`)

### States

* **idle** — no active session.
* **recording** — capturing audio to temp file.
* **paused** — audio session paused, retain buffer.
* **finishing** — finalize file; hand off to provider to persist.
* **failed** — unrecoverable error; show inline error.

### Events

* `REQUEST_PERMISSION` → ask OS for mic permission.
* `START` → begin recording.
* `PAUSE` / `RESUME` → toggle paused state.
* `FINISH` → stop, finalize, save.
* `CANCEL` → discard and return to idle.
* `INTERRUPTED` → OS audio interruption (call/notification, app backgrounded without proper setup).
* `SAVE_SUCCESS` / `SAVE_ERROR` → result from persistence call.

### Transitions

* **idle** --`REQUEST_PERMISSION`(granted)→ **recording**; if denied → **failed**.
* **recording** --`PAUSE`→ **paused**; --`FINISH`→ **finishing**; --`INTERRUPTED`→ **paused** (auto-recover if possible).
* **paused** --`RESUME`→ **recording**; --`FINISH`→ **finishing**; --`CANCEL`→ **idle**.
* **finishing** --`SAVE_SUCCESS`→ **idle** (modal closes); --`SAVE_ERROR`→ **failed**.
* **failed** --`RESET`→ **idle**.

> Implementation note: `useRecorder` exposes `{ state, start, pause, resume, finish, cancel, error }` and returns the current `audioUri`, `durationMs`, and a stable file path for the session.

---

## UI States (in `app/record.tsx`)

| Recorder state | Primary CTA            | Secondary | Tertiary | Indicators                   |
| -------------- | ---------------------- | --------- | -------- | ---------------------------- |
| idle           | **Start**              | —         | Close    | Plant pulses subtly          |
| recording      | **Finish**             | Pause     | Cancel   | Live waveform, running timer |
| paused         | **Finish**             | Resume    | Cancel   | Waveform dimmed/paused       |
| finishing      | **Saving…** (disabled) | —         | —        | Spinner; buttons locked      |
| failed         | **Try again**          | —         | Close    | Inline error text            |

**Waveform**

* `Waveform.tsx` reads amplitude frames from `useRecorder` and renders bars.
* While paused, freeze bars and dim opacity.

---

## Persistence (hand-off)

On `FINISH`, `useRecorder` stops the session, seals the temp `.m4a`, and calls:

```ts
addEntry({
  audioUri: tempFile,
  durationMs,
  startedAt,
  // text fields empty at creation; processing starts in background
});
```

* `addEntry` is provided by the Journal provider (secure/local-first). The modal closes after `SAVE_SUCCESS`.
* The new entry appears in **Journal** with `processingStage = "transcribing"` (see transcription pipeline doc).

---

## Error Cases & Handling

| Case                                   | Detection                     | UI/Copy                                                        | Recovery                                             |
| -------------------------------------- | ----------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Mic permission denied                  | OS permission result          | “Microphone access is required to record.” → **Open Settings** | Deep-link to settings if supported; stay in **idle** |
| No input device / simulator glitch     | Exception on `START`          | “Couldn’t access the mic. Restart the simulator or try again.” | Show **Try again**; log error                        |
| Interruption (phone call, Siri, alarm) | OS audio interruption         | Auto-pause; toast: “Recording paused due to interruption.”     | Let user **Resume**                                  |
| Storage full                           | Exception on finalize or save | “Not enough storage to save this entry.”                       | Offer **Try again** after user frees space           |
| Save error (DB write)                  | `SAVE_ERROR`                  | “We couldn’t save this entry.”                                 | Keep temp file; allow **Try again**                  |
| Very short clip (< N ms)               | Duration check                | “Too short to save.”                                           | Keep recording or **Cancel**                         |

> All errors should be logged with a stable `recordingSessionId` for debugging.

---

## Background Recording Notes

Recording can continue with the app backgrounded **only if** platform setup is complete. See **[BACKGROUND_RECORDING_SETUP.md](../BACKGROUND_RECORDING_SETUP.md)**.

* iOS: requires background audio mode + proper AVAudioSession category.
* Android: requires foreground service + notification.
* If background pre-reqs are missing, auto-pause on background and show a toast on return: “Recording paused when app left foreground.”

---

## Metrics & Telemetry (optional but useful)

* `recorder.start` / `pause` / `resume` / `finish` (with durations)
* error counts by `case`
* average session length

---

## Test Checklist

* Start → speak → Finish → entry appears in Journal as Processing.
* Pause/Resume multiple times; ensure duration is correct.
* Interruption auto-pauses and resumes cleanly.
* Save with low storage (simulate) shows proper error.
* Permission denial path surfaces settings link.
