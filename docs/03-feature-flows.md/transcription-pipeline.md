# Transcription Pipeline

Scope: audio file → queue → transcribe → refine → update entry.

**Files**

* `services/TranscriptionService.ts` — orchestrates the pipeline; manages queue, retries, and stage transitions.
* `services/TextService.ts` — calls Gemini for refinement (cleaning, structuring, title).
* `app/entry/[id].tsx` — per-entry UI; retry handlers for failed stages.
* `components/EntryContent.tsx` — renders content by stage (processing vs. final).

---

## Overview

1. **Create entry**: recording flow persists a placeholder with `processingStage = "transcribing"` and `rawText = null`, `text = null`.
2. **Queue**: `TranscriptionService` picks up new entries and enqueues their audio for processing.
3. **Transcribe**: send audio to Gemini; receive **Raw Transcript** → save to DB.
4. **Refine**: send raw transcript to Gemini; receive **Title + Refined Text** → save to DB.
5. **Complete**: mark `processingStage = "completed"`; UI re-renders with final content.

---

## Stages (Enum)

```ts
export type ProcessingStage =
  | 'transcribing'
  | 'refining'
  | 'completed'
  | 'transcribe_failed'
  | 'refine_failed';
```

**Invariant**

* Exactly one stage is active per entry.
* Stage can only advance forward (or to a *_failed state). On manual retry we resume at the earliest failed stage.

---

## Queue Model

* **Type**: in-memory FIFO with persistence hints (re-hydrates from DB on app start to pick up unfinished work).
* **Concurrency**: single-flight by default (N=1) to avoid device thrash; configurable if needed.
* **Backpressure**: if offline or API errors, queue holds items and backs off.
* **Identity**: each job references `entryId` and `audioUri`.

**Lifecycle**

1. `enqueue(entryId, audioUri)` when a new entry is saved.
2. Worker loop pulls the head job if no other job is running.
3. After each stage, persist results and advance stage.
4. On error, set failed stage on entry and stop processing that job.

---

## Transcription (Speech → Text)

**Input**: `audioUri` (e.g., `.m4a`), duration.

**Call**

```ts
const rawText = await SpeechService.transcribeAudio({ audioUri, timeoutMs });
```

**Timeout**

* Dynamic based on duration; add headroom for network (e.g., `base + k * seconds`).

**Persist**

```ts
Database.updateEntry(entryId, {
  rawText,
  processingStage: 'refining',
});
```

**Errors → `transcribe_failed`**

* network / 5xx
* payload/format errors
* auth (missing/invalid API key)

**UI**

* In `EntryContent`, show **“Transcribing…”** with a lightweight skeleton.

---

## Refinement (Clean + Title)

**Input**: `rawText`.

**Call**

```ts
const { title, text } = await TextService.refineTranscription({ rawText, timeoutMs });
```

**Persist**

```ts
Database.updateEntry(entryId, {
  title,
  text,
  processingStage: 'completed',
});
```

**Errors → `refine_failed`**

* network / 5xx
* prompt/format errors
* auth

**UI**

* In `EntryContent`, show **“Refining…”** skeleton.

---

## Retry Logic

### Automatic (background)

* **Policy**: exponential backoff per stage.
* **Schedule**: try 1s, 5s, 30s, 2m, then give up and mark `*_failed`.
* **Max Attempts**: 5 per stage (configurable).
* **Reset Conditions**: app relaunch resumes pending jobs unless terminal failure is set.

### Manual (from UI)

* Surfaces in `app/entry/[id].tsx` for `*_failed` states.
* **Buttons**:

  * `Retry transcription` if `transcribe_failed` → sets stage back to `transcribing` and re-enqueues.
  * `Retry refinement` if `refine_failed` → sets stage to `refining` and re-enqueues.
* Show last error message (short, developer-friendly code + plain message).

---

## Failure UI (per stage)

| Stage             | Title                             | Body                              | Actions                                            |
| ----------------- | --------------------------------- | --------------------------------- | -------------------------------------------------- |
| transcribe_failed | “Couldn’t transcribe this entry.” | “Check connection or try again.”  | **Retry transcription** / **Delete entry**         |
| refine_failed     | “Couldn’t clean up the text.”     | “We’ll keep your raw transcript.” | **Retry refinement** / **Keep as-is** / **Delete** |

* If `rawText` exists on `refine_failed`, display it read-only so the entry remains usable.
* Deleting asks for confirmation and removes audio + DB row.

---

## Data Updates (DB Writes)

Minimum fields touched across the pipeline:

```ts
Entry {
  id: string
  createdAt: number
  durationMs: number
  audioUri: string
  // processing
  processingStage: ProcessingStage
  // text
  rawText?: string | null
  text?: string | null
  title?: string | null
  // errors (optional)
  lastErrorCode?: string | null
  lastErrorMessage?: string | null
}
```

**Indexing**

* index by `createdAt` (desc) for journal listing
* optional index on `processingStage` to quickly find pending/failed

---

## Callbacks & Notifications

* `onStageChange(entryId, stage)` — emit to update live UI (e.g., via context/provider).
* `onError(entryId, stage, err)` — log + set `lastError*` fields.
* `onComplete(entryId)` — emit for analytics (“entry_completed”).

---

## Performance & Robustness

* Stream upload where supported; otherwise chunked upload.
* Cap max audio duration (configurable). Very long files warn before upload.
* Normalize audio (sample rate/bitrate) on-device to reduce failures.
* Memory guard: release large buffers after each stage.
* Queue persistence: on app start, scan DB for entries in `transcribing`/`refining` and re-enqueue.

---

## Privacy Notes

* Only the **minimum** needed leaves the device: audio → STT, then text → refine.
* All results are saved **encrypted** on-device; no third-party storage by default.
* Errors should redact PII when logged.

---

## Telemetry (optional)

* `transcription.start/success/fail` (duration, bytes)
* `refinement.start/success/fail` (tokens, duration)
* backoff steps and final failure reasons

---

## Pseudocode (Service Orchestrator)

```ts
async function process(entry: Entry) {
  try {
    if (entry.processingStage === 'transcribing') {
      const rawText = await SpeechService.transcribeAudio({ audioUri: entry.audioUri, timeoutMs: t(entry) });
      await Database.updateEntry(entry.id, { rawText, processingStage: 'refining' });
    }

    if (entry.processingStage === 'refining') {
      const { title, text } = await TextService.refineTranscription({ rawText: entry.rawText!, timeoutMs: t(entry) });
      await Database.updateEntry(entry.id, { title, text, processingStage: 'completed' });
    }
  } catch (err) {
    const stage = entry.processingStage === 'refining' ? 'refine_failed' : 'transcribe_failed';
    await Database.updateEntry(entry.id, { processingStage: stage, lastErrorCode: code(err), lastErrorMessage: msg(err) });
    throw err; // let the runner apply backoff/retry
  }
}
```

---

## Test Checklist

* New entry moves `transcribing → refining → completed` with correct DB updates.
* Kill/relaunch app during each stage → job resumes.
* Force a 401/timeout → reaches `*_failed` and shows retry.
* Manual retry advances and completes.
* `refine_failed` still renders `rawText` and allows usage.
* Deleting a failed entry removes audio + row and updates the list.
