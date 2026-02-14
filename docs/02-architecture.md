# 02 — Architecture (Refactored)

This document explains the refactored Plantalk architecture. It focuses on responsibilities, boundaries, and data flow so new contributors can ship without breaking core flows.

---

## 1) Design Principles

* **Feature islands**: Each feature is self‑contained (UI + local hooks). Features never import from other features.
* **Core ≠ React**: Business logic (DB, audio, AI) lives in Core services. They are framework‑agnostic and testable.
* **Providers orchestrate**: Providers compose services, manage app‑wide state, and expose clean hooks.
* **Shared is leaf-only**: Reusable UI, hooks, and helpers. Shared never imports from Core or Features.
* **Stable surfaces**: Each module exposes a narrow public API via an `index.ts` barrel.

---

## 2) Layered Architecture

```
App (routes)
  ↓
Features (UI + feature hooks)
  ↓
Core (providers ←→ services)
  ↓
Shared (UI primitives, hooks, utils, types, constants)
```

### App Layer — Routing & Composition

* **Where**: `app/`
* **What**: Expo Router screens. Compose feature components and consume provider hooks.
* **Rule**: No direct service calls. No business logic.

### Features Layer — Vertical Slices

* **Where**: `src/features/*`
* **What**: Screen‑level UI components and feature‑local hooks.
* **Rule**: May import **Shared** and **Core providers**. **Must not** import other features.

### Core Layer — State + I/O

* **Where**: `src/core/*`
* **Providers**: App‑wide state machines that orchestrate services and expose hooks.
* **Services**: Pure business logic and I/O (SQLite, file system, AI). No React.
* **Rule**: Services never import from Features/Shared UI.

### Shared Layer — Reuse

* **Where**: `src/shared/*`
* **What**: UI primitives, cross‑cutting hooks, utilities, types, constants.
* **Rule**: Shared cannot depend on Core or Features.

---

## 3) Directory Map (current)

```
app/
  (tabs)/
    _layout.tsx
    index.tsx          # Home / record entry CTA
    journal.tsx        # Sectioned Journal List
    insights.tsx       # Insights + Dev tools (e.g., audio migration)
  entry/[id].tsx       # Entry detail screen
  _layout.tsx          # Root provider stack
  record.tsx           # Recording modal

src/
  core/
    providers/
      journal/
        SecureJournalProvider.tsx     # Hook: useSecureJournal()
        index.ts                      # Public surface
        types.ts
        initialization/
          initializeServices.ts
          migrationService.ts
          stateLoader.ts
        operations/
          entryOperations.ts
          backupOperations.ts
          streakOperations.ts
          diagnosticsOperations.ts
    services/
      ai/
        TextService.ts
        SpeechService.ts
        TranscriptionService.ts
        index.ts
      storage/
        DatabaseService.ts
        SecureStorageService.ts
        BackupService.ts
        DataValidationService.ts
        index.ts

  features/
    recording/
      components/Waveform.tsx
      hooks/useRecorder.ts
      index.ts
    journal/
      components/HistoryList.tsx
      components/EntryItem.tsx
      components/HistoryHeader.tsx
      components/AudioPathMigration.tsx
      index.ts
    entry-detail/
      components/EntryContent.tsx
      components/EntryDetailHeader.tsx
      hooks/useEntryEditor.ts
      hooks/useEntryOptions.ts
      hooks/useDateRevealAnimation.ts
      index.ts
    audio-player/
      components/AudioPlayer.tsx
      hooks/useAudioPlayer.ts
      index.ts

  shared/
    components/
      layout/ScreenWrapper.tsx
      ui/IconSymbol(.ios).tsx
      ui/TabBarBackground(.ios).tsx
      ui/ExternalLink.tsx
      ui/HapticTab.tsx
      index.ts
    hooks/
      useColorScheme(.web).ts
      index.ts
    utils/
      audioPath.ts
      index.ts
    types/
      journal.ts
      index.ts

styles/
  theme.ts
```

---

## 4) Data & Control Flows

### A) Recording → Entry Creation

1. **UI**: `app/record.tsx` uses `features/recording` (`useRecorder`, `Waveform`).
2. **Finish**: `useRecorder` seals temp audio and calls `useSecureJournal().addEntry()`.
3. **Provider**: Journal provider inserts a placeholder entry (stage: `transcribing`) and triggers the pipeline.
4. **Services**: `TranscriptionService` → `SpeechService` (STT), then `TextService` (refinement & title).
5. **DB**: `DatabaseService` persists `rawText`, then `title/text`, stage → `completed`.

### B) Journal Listing

1. **UI**: `app/(tabs)/journal.tsx` renders `features/journal/HistoryList`.
2. **Data**: `useSecureJournal().state.entries` (already filtered/sorted in provider selectors).
3. **UX**: Sectioned by day (“Today”, “Yesterday”, Past 7/30 Days”, then Month/Year); swipe‑to‑delete hooks into provider ops.

### C) Entry Detail

1. **UI**: `app/entry/[id].tsx` composes `EntryDetailHeader`, `AudioPlayer`, and `EntryContent`.
2. **Retry**: Failed stages expose **Retry Transcription/Refinement** that call provider methods, which re‑enqueue jobs.

### D) Backup & Migration

* **BackupService**: encrypted export/import of DB rows + audio files.
* **Audio path migration** (relative ↔ absolute) exposed via `features/journal/AudioPathMigration` and helpers in `shared/utils/audioPath`.

---

## 5) Providers (Journal)

**Responsibilities**

* App‑wide state for entries and metadata.
* Boot sequence: open DB, run migrations, rehydrate state, resume pending jobs.
* CRUD operations: create/update/delete/restore, plus streaks and diagnostics.
* Pipeline orchestration: advance stages and update UI via state.

**Public Hook**

```ts
const {
  state,                 // entries, counts, etc.
  addEntry,              // create placeholder + enqueue
  updateEntry,           // patch fields
  deleteEntry,           // soft/hard delete
  updateEntryProgress,   // stage transitions
  updateEntryTranscription,
  retranscribeEntry,     // manual retry helpers
} = useSecureJournal();
```

**Policy**

* All writes wrapped in DB transactions; state mirrors DB after commit.
* Stage transitions are linear (`transcribing → refining → completed`, or `*_failed`).

---

## 6) Services

* **DatabaseService**: SQLite schema, migrations, queries, indices. No UI.
* **SecureStorageService**: key/value secrets & tokens.
* **BackupService**: encrypted archive export/import, plus file copy orchestration.
* **DataValidationService**: light sanity checks before writes.
* **SpeechService**: speech‑to‑text for audio.
* **TextService**: refinement + title generation.
* **TranscriptionService**: queue, retries, and stage orchestration.

**Rules**

* No React imports.
* Deterministic, unit‑testable functions.

---

## 7) Dependency Rules (enforced by lint)

* **Features →** Shared, Core *providers* (hooks only).
* **Core providers →** Core services.
* **Core services →** (platform APIs, storage, network). No React/Features.
* **Shared →** nothing outside Shared. (Absolutely no Core imports.)

Use only public barrels (`index.ts`) from each module to avoid deep linking into internals.

---

## 8) Initialization & Migrations

On app start (root layout):

1. Mount `SecureJournalProvider`.
2. Provider runs `initializeServices`: open DB, verify schema, run migrations.
3. Load entries into memory and resume pending jobs (`transcribing/refining`).
4. Expose ready state to screens.

**Migrations**

* Versioned, idempotent steps (e.g., new columns, indices).
* Audio path normalization handled via helpers in `shared/utils/audioPath`.

---

## 9) Error Handling (high‑level)

* **Recording/Save**: user‑facing toasts + retry; preserve temp audio when DB write fails.
* **Transcription/Refinement**: stage → `*_failed`, show clear retry options; store last error code/message.
* **Deletion**: hard delete removes DB row **and** audio file; failures schedule cleanup.
* **Backup/Restore**: cryptographic checks; never partial‑restore without user confirmation.

---

## 10) Performance Notes

* Section lists pre‑grouped by provider selectors to minimize render work.
* Long bodies loaded lazily on entry detail; list uses short preview text.
* Queue concurrency kept low by default to avoid device thrash.
* Heavy work (backup, migrations) batched and off critical path.

---

## 11) Testing Surfaces

* **Unit**: services (Database, Speech/Text, Transcription orchestration, Backup).
* **Integration**: provider flows (create → stages → complete; delete → file cleanup).
* **UI**: recording modal states, journal list grouping, entry detail retries.

---

## 12) Future Extensions (scaffolding only)

* **Search feature**: add `src/core/services/search/` (FTS/semantic later), `src/core/providers/search/`, and `src/features/search/`. Gate with runtime capability checks and job queues for indexing.
* **Settings feature**: centralize preferences (theme, transcription engines, backup targets).

---

## 13) Quick Rules of Thumb

* Import from barrels, not deep files.
* Features don’t talk to each other.
* Shared doesn’t know Core.
* Services don’t know React.
* Providers are the only bridge between UI and services.
