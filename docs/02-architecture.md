## Architecture

Plantalk is built as a highly responsive, mobile-first, voice-centric application. The architecture prioritizes speed, data privacy, and a seamless developer experience using a modern React Native ecosystem.

The system is structured into four main layers: **View/UI**, **State/Context**, **Services/Logic**, and **Data Storage**.

---

### 1. Technology Stack

| Layer | Key Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React Native / Expo | Cross-platform development. |
| **Navigation** | Expo Router | File-system-based routing for a native stack/tab experience. |
| **UI/Animation** | React Native Reanimated | Fluid, native-level animations and gestures. |
| **Language** | TypeScript | Enhanced code quality and type safety. |
| **Data Flow** | React Context (Custom Providers) | Global state management for journal entries and app status. |
| **Transcription** | Gemini API (via custom service) | Transcribes audio to raw text. |
| **Refinement** | Gemini API (via custom service) | Cleans, formats, and titles the transcription. |

---

### 2. Core Architecture Layers

The application architecture is a simple pipeline that follows clear layers: 

UI → Hooks → Context → Services → Storage

#### A. UI (View) Layer
* **Location**: `app/` and `components/`.
* **Role**: Displays data and captures user input, representing the entry point for all actions.
    * **`app/(tabs)/`**: The primary tab navigation interface, including the **Entry** (`index.tsx`), **Journal** (`journal.tsx`), and **Insights** (`insights.tsx`) screens.
    * **`app/record.tsx`**: A modal screen dedicated to capturing a new voice entry.
    * **`components/`**: Houses reusable UI primitives and complex view components (e.g., `AudioPlayer.tsx`, `HistoryList.tsx`).

#### B. Hooks Layer
* **Location**: `hooks/`.
* **Role**: Manages complex local component state, abstracts external APIs, and transforms data for presentation. Hooks handle interaction with native features (e.g., audio recording) and pass commands down to the Context layer.
    * **Examples**: `useRecorder.ts` manages the recording lifecycle, and `useAudioPlayer.ts` controls playback.

#### C. Context Layer (State)
* **Location**: `context/SecureJournalProvider.tsx`.
* **Role**: The single source of truth (`JournalState`) for the entire application, exposed via the `useSecureJournal` hook. This layer receives commands (e.g., `addEntry`, `deleteEntry`) from the Hooks/UI layers and orchestrates the necessary actions by calling the Services layer.
    * **`JournalState`** holds core data such as the list of **`JournalEntry`** objects and the user's **`streak`**.

#### D. Services Layer (Business Logic)
* **Location**: `services/`.
* **Role**: Contains all non-UI logic, external API integrations, and complex data pipeline management. This layer isolates external dependencies and ensures data integrity before it reaches storage.
    * **`TranscriptionService.ts`**: Orchestrates the voice-to-text pipeline, managing the queue of recordings and coordinating between the Speech and Text services.
    * **`SpeechService.ts`**: Integrates with the **Gemini API** for direct audio-to-text conversion.
    * **`TextService.ts`**: Uses the **Gemini API** for **Refinement** (cleaning, formatting, and title generation).
    * **`DataValidationService.ts`**: Performs automatic **corruption detection and repair**.

#### E. Storage Layer (Persistence)
* **Location**: `services/` (Internal logic within services).
* **Role**: Provides secure, persistent, and reliable storage for all application data, abstracting complex file system and encryption details.
    * **`DatabaseService.ts`**: Manages the local **SQLite database**, providing ACID compliance and indexed storage for all journal entries and metadata.
    * **`SecureStorageService.ts`**: Manages **AES-256 encryption**, and secures the encryption key in the device's **Keychain**.
    * **`BackupService.ts`**: Manages the creation and restoration of secure, encrypted backups.

---

### 3. Key Feature Flow: Voice-to-Entry Pipeline

This flow is asynchronous and runs in the background, handled by the **`TranscriptionService`**.

1.  **Record**: User taps **Record** $\rightarrow$ `useRecorder` captures audio to a temporary file (`.m4a`).
2.  **Save/Queue**: User taps **Finish** $\rightarrow$ `useRecorder` calls `addEntry` on `SecureJournalProvider`.
3.  **Persistence**: `SecureJournalProvider` saves the entry placeholder and moves the audio file to permanent, secure storage. It then hands the job off to the `TranscriptionService` queue.
4.  **Transcribe**: `TranscriptionService` calls `SpeechService.transcribeAudio` (Gemini API) $\rightarrow$ **Raw Transcript** is returned.
5.  **Refine**: `TranscriptionService` calls `TextService.refineTranscription` (Gemini API) to clean the text and generate a title $\rightarrow$ **Refined Text** and **Title** are returned.
6.  **Update State**: `TranscriptionService` calls `updateEntryTranscription` on `SecureJournalProvider` $\rightarrow$ The final text and title are saved to the **SQLite database** and reflected in the UI.

---

### 4. Data Privacy and Integrity

The architecture is built on a **local-first** and **secure-by-default** principle.

* **Local Storage**: All journal data (entries, audio files) remains encrypted on the user's device.
* **SQLite**: Replaces error-prone JSON files, ensuring transactions and integrity.
* **Encryption**: AES-256 encryption and device keychain protection for all sensitive data.
* **Self-Healing**: Automatic recovery from data corruption using the `DataValidationService` ensures data is durable and available.
* **API Usage**: Audio is sent to the Gemini API only for the necessary processing steps, minimizing time outside the secure local environment.
