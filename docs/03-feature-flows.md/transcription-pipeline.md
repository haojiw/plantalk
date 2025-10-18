# Feature Flow: The Transcription Pipeline Journey

This document explains what happens in the background *after* your recording is saved. This is the "magic" that turns your raw audio file into a polished, titled, and formatted journal entry.

The journey starts exactly where the "Recording Flow" ended: your new entry, with a "Processing..." status, has just been added to the database and the journal list.

### High-Level Flow

```mermaid
graph TD
    A(Recording Flow Ends) --> B(entryOperations.addEntry);
    B --> C(transcriptionService.addToQueue);
    
    subgraph "TranscriptionService (The Project Manager)"
        C --> D{"Process Queue (1 at a time)"};
        D --> E(onProgress: 'transcribing');
        E --> F[SpeechService: transcribeAudio];
        F --> G(Gemini API - Speech);
        G --> H{Raw Text};
        H --> I(onProgress: 'refining');
        I --> J[TextService: refineTranscription];
        J --> K(Gemini API - Text);
        K --> L{Title + Refined Text};
        L --> M(onComplete: 'completed');
    end

    subgraph "Provider & UI (The Feedback Loop)"
        E --> P1(Provider: updateEntryProgress);
        P1 --> P2(DB: stage = 'transcribing');
        P2 --> P3("UI: ""Transcribing audio...""");

        I --> P4(Provider: updateEntryProgress);
        P4 --> P5(DB: stage = 'refining');
        P5 --> P6("UI: ""Refining text...""");

        M --> P7(Provider: updateEntryTranscription);
        P7 --> P8("DB: stage = 'completed' + save text");
        P8 --> P9(UI: Show final entry);
    end
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#f9f,stroke:#333,stroke-width:2px
    style M fill:#f9f,stroke:#333,stroke-width:2px
```

-----

## 1\. The Handoff

The "Recording Flow" finished by calling `addEntry()`. The *very last thing* this function does, after saving the entry to the database, is to make a call to the "project manager" of the transcription pipeline:

```typescript
// Inside entryOperations.ts
transcriptionService.addToQueue({
  entryId: newEntry.id,
  audioUri: newEntry.audioUri,
  // ...and all the callbacks
});
```

This call is the starting pistol for the entire pipeline.

-----

## 2\. The Project Manager (`TranscriptionService.ts`)

This service, located at `src/core/services/ai/TranscriptionService.ts`, is the "brain" of the operation. It maintains a **FIFO (First-In, First-Out) queue** of jobs. This is critical because it ensures your app only processes **one audio file at a time**, preventing it from overwhelming your device or hitting API rate limits.

As soon as your new entry hits the queue, the service's `processQueue` method picks it up and begins its two-step journey.

-----

## 3\. The Journey: From Audio to Text

The service executes the `processTranscriptionTask` for your entry.

### Step 1: The Raw Transcript (`SpeechService.ts`)

First, the app needs to turn your voice into plain text.

1.  **Callback 1 (UI Update):** The service immediately calls the `onProgress(entryId, 'transcribing')` callback.
      * This callback traces back to the `SecureJournalProvider`, which updates the entry in the **SQLite database** with `processingStage: 'transcribing'`.
      * The UI, which is listening for state changes, re-renders to show "Transcribing audio...".
2.  **The Work:** The service calls `speechService.transcribeAudio(audioUri)`.
3.  **The "Vault" (`SpeechService.ts`):** This specialized service does the following:
      * Gets the **absolute path** for your audio file (e.g., `file:///.../audio/audio_123.m4a`).
      * Reads the entire audio file into a **base64-encoded** string.
      * Sends this large string to the **Google Gemini API** (`gemini-2.5-flash`) with a simple prompt: "Generate a transcript of the speech.".
      * It also calculates a **dynamic timeout** based on your audio's duration—longer recordings are given more time to process.
4.  **The Result:** The Gemini API returns the raw, unformatted transcription (e.g., "today i reflected on my journey and realized...").

### Step 2: The Refinement (`TextService.ts`)

Now that we have the raw text, the project manager moves to the next stage.

1.  **Callback 2 (UI Update):** The service calls `onProgress(entryId, 'refining')`.
      * Just like before, the provider updates the database stage.
      * The UI re-renders to show "Refining text...".
2.  **The Work:** The service calls `textService.refineTranscription(rawText)`.
3.  **The "Editor" (`TextService.ts`):** This service sends the raw text back to the **Gemini API**, but with a much more complex prompt. This prompt instructs the AI to act as an "expert text processing specialist" and to:
      * Generate a compelling **2-5 word title**.
      * Clean up transcription errors and filler words ("um," "like").
      * Maintain your **authentic voice** and personality.
      * Structure the text with paragraph breaks.
      * Return the result in a **clean JSON format**.
4.  **The Result:** The API returns the final, polished product:
    ```json
    {
      "title": "Reflecting on Growth",
      "formattedText": "Today I reflected on my journey and realized how much I've grown. The challenges I faced last week taught me valuable lessons about resilience and patience."
    }
    ```

-----

## 4\. The Journey's End: Saving and Display

The `TranscriptionService` has everything it needs.

1.  **Callback 3 (The Final Handoff):** The service calls the `onComplete(entryId, result, 'completed')` callback, passing along the new title, refined text, and raw text.
2.  **The Provider (`SecureJournalProvider.tsx`):** The provider catches this callback and calls `entryOps.updateEntryTranscription()`.
3.  **The "Ledger" (`DatabaseService.ts`):** This operation updates your entry in the SQLite database—setting the final `title`, `text`, `rawText`, and `processingStage: 'completed'`.
4.  **The Final Refresh:** The provider calls `loadState()` one last time. Your app's state is refreshed from the database, and the UI re-renders to show your fully completed, formatted, and titled journal entry.

-----

## 5\. What If It Fails? (Error Handling)

The pipeline is designed to be resilient and to tell you what went wrong.

### Scenario 1: Transcription Fails

If `SpeechService` fails (e.g., the audio is silent or the API is down), the `onComplete` callback is called with `status: 'failed'`.

  * The entry's stage is set to `transcribing_failed` in the database.
  * When you open the entry, `EntryContent.tsx` sees this stage and shows a "Transcription Failed" message with a **"Try Again"** button.
  * Pressing "Try Again" calls `retranscribeEntry`, which simply puts the job back in the queue to try again.

### Scenario 2: Refinement Fails

If `TextService` fails, *we still have the raw transcript*.

  * The orchestrator calls `onComplete` but saves the *raw text* as the main text and sets the stage to `refining_failed`.
  * `EntryContent.tsx` sees this, **displays the raw text** (so your thoughts aren't lost), and shows a "Refinement Failed" message with a **"Refine Text"** button.
  * Pressing this button also re-queues the job, but this time it will skip Step 1 (Transcription) and go straight to Step 2 (Refinement).
  