# Architecture

This guide outlines the app's architecture, which is a simple pipeline that follows clear layers: **UI → Hooks → Context → Services → Storage**

-----

### 1\. Technology Stack

| Layer | Key Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React Native / Expo | Cross-platform development. |
| **Navigation** | Expo Router | File-system-based routing for a native stack/tab experience. |
| **UI/Animation** | React Native Reanimated | Fluid, native-level animations and gestures. |
| **Language** | TypeScript | Enhanced code quality and type safety. |
| **Data Flow** | React Context (Custom Providers) | Global state management for journal entries and app status. |
| **Transcription** | Gemini API (via custom service) | Transcribes audio to raw text. |
| **Refinement** | Gemini API (via custom service) | Cleans, formats, and titles the transcription. |

-----

### 2\. Visual Architecture

The application follows a layered architecture with a clear, unidirectional data flow. Commands originate from the UI and flow down through each layer to the persistent storage.

```
[ UI Layer (Screens & Components) ]
       ↓ (User Actions)
[ Hooks Layer (State & Logic) ]
       ↓ (Calls Context Methods)
[ Context Layer (Global State - SecureJournalProvider) ]
       ↓ (Orchestrates Services)
[ Services Layer (Business Logic & APIs) ]
       ↓ (Data Processing & Validation)
[ Storage Layer (SQLite & Secure File System) ]
```

-----

### 3\. Core Architecture Layers

The application's data flow is a pipeline that follows clear layers from the user interface down to secure storage. This separation of concerns makes the codebase predictable and easy to navigate.

#### A. UI (View) Layer

  * **Role**: Displays data and captures user input. It is the entry point for all user actions.
  * **Location**:
      * **`app/`**: Contains all screens, which are directly tied to app routes.
          * `app/(tabs)/`: Primary tab screens like Journal (`journal.tsx`) and Insights (`insights.tsx`).
          * `app/record.tsx`: The modal screen for capturing a new voice entry.
      * **`components/`**: Contains reusable UI building blocks used across screens, such as `AudioPlayer.tsx` and `HistoryList.tsx`.

#### B. Hooks Layer

  * **Role**: Manages complex component state and abstracts native device features (e.g., audio recording). Hooks capture user intent and trigger actions on the Context layer.
  * **Location**: `hooks/`.
      * **Examples**: `useRecorder.ts` manages the entire recording lifecycle. `useAudioPlayer.ts` controls audio playback.

#### C. Context Layer (State)

  * **Role**: Acts as the application's central hub and single source of truth for global state (`JournalState`). It is exposed via the `useSecureJournal` hook and orchestrates the necessary service calls to fulfill commands like `addEntry`.
  * **Location**: `context/SecureJournalProvider.tsx`.

#### D. Services Layer (Business Logic)

  * **Role**: Contains all non-UI logic, external API integrations, and the core data persistence pipeline. This robust layer was designed specifically to solve the data loss and corruption issues of the previous JSON-based storage system, providing production-grade data integrity.
  * **Location**: `services/`.
      * **`TranscriptionService.ts`**: Orchestrates the entire voice-to-text pipeline, from queuing to completion.
      * **`SpeechService.ts` & `TextService.ts`**: Integrate with the Gemini API for audio transcription and text refinement, respectively.
      * **`DataValidationService.ts`**: Performs automatic data corruption detection and repair.

#### E. Storage Layer (Persistence)

  * **Role**: Provides secure, persistent, and reliable on-device storage, abstracting away the complexities of the database and encrypted file system.
  * **Location**: Internal logic within the `services/` directory.
      * **`DatabaseService.ts`**: Manages the local SQLite database, providing ACID compliance and indexed storage for all journal entries and metadata.
      * **`SecureStorageService.ts`**: Manages AES-256 encryption and secures the encryption key in the device's Keychain.
      * **`BackupService.ts`**: Manages the creation and restoration of secure, encrypted backups.

-----

### 4\. Key Feature Flow: Voice-to-Entry Pipeline

This flow is asynchronous and runs in the background, handled by the `TranscriptionService`.

1.  **Record**: A user records their voice → `useRecorder` captures the audio to a temporary `.m4a` file.
2.  **Save/Queue**: The user finishes → `useRecorder` calls the `addEntry` function on `SecureJournalProvider`.
3.  **Persistence**: `SecureJournalProvider` saves an entry placeholder, moves the audio file to permanent storage, and adds the task to the `TranscriptionService` queue.
4.  **Transcribe**: `TranscriptionService` calls the `SpeechService` to convert the audio to a **Raw Transcript** using the Gemini API.
5.  **Refine**: The raw transcript is passed to the `TextService`, which uses the Gemini API to clean the text, format it, and generate a title, returning **Refined Text**.
6.  **Update State**: `TranscriptionService` calls `updateEntryTranscription` on `SecureJournalProvider`. The final text and title are saved to the SQLite database and the UI updates to show the completed entry.

-----

### 5\. Data Privacy and Integrity

The architecture is built on a **local-first** and **secure-by-default** principle.

  * **Local Storage**: All journal data, including entries and audio files, remains encrypted on the user's device.
  * **SQLite**: Replaces error-prone JSON files, ensuring transactional integrity and preventing data corruption.
  * **Encryption**: AES-256 encryption and device keychain protection are used for all sensitive data.
  * **Self-Healing**: The `DataValidationService` provides automatic recovery from data corruption, ensuring data is durable and available.
  * **API Usage**: Audio data is sent to the Gemini API only for the necessary processing steps, minimizing its time outside the secure local environment.

  alternatives
  choice of architecture
  