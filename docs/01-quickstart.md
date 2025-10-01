## Plantalk Developer Quickstart

This guide gets your local environment set up, verifies core functionality, and covers common issues.

### 0\) Prerequisites

  * **Node**: LTS (Long-Term Support) version
  * **npm**: Latest stable
  * **iOS/Android Simulator/Emulator**: Ensure at least one is configured and runnable.
  * **Expo Go App**: Optional, but recommended for testing on a physical device.

-----

### 1\) Setup & Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd plantalk
npm install
```

> **Tip**: If you encounter native module errors, clear your cache and node modules:
>
> `rm -rf node_modules package-lock.json`
> `npm install`

-----

### 2\) Start the Dev Server

The default start command uses the tunnel connection for easy physical device testing.

```bash
npm start
```

Once the bundler is running, press:

  * **i** for the **iOS Simulator**,
  * **a** for the **Android Emulator**, or
  * Scan the QR code with the **Expo Go** app on your physical device.

-----

### 3\) First Run Verification (Core Flow)

The app must successfully record, process, and persist data.

1.  **Grant Permission**: Grant **microphone permission** when prompted.
2.  **Record**: Tap the plant icon, tap the mic to start, say a test phrase, and tap the checkmark to finish.
3.  **Observe Processing**: The new entry in the **Journal** tab should initially show **"Processing..."** (Transcribing/Refining).
4.  **Confirm Entry**: Wait for the AI to complete its process. The new entry should display a **title** and a **formatted text body** (Transcription & Refinement success).
5.  **Verify Persistence**: **Kill and relaunch** the app from your simulator/device. The new entry must still be present in the **Journal** tab (Secure Storage is working).

If all five steps pass, your environment is ready.

-----

### 4\) Environment Secrets & Mock Mode

Plantalk uses the Gemini API for transcription and text refinement.

1.  **Configure API Key**:

      * Create a file named **`.env`** in the root directory.
      * Copy the key from `.env.example` and fill in your Gemini API key:
        ```bash
        GEMINI_API_KEY=your_gemini_key_here
        ```
      * **Restart the dev server** after adding or changing a key.

2.  **Mock Mode**:

      * To develop the UI without an API key or network access, **leave the `GEMINI_API_KEY` blank** in your `.env` file.
      * The app's services will automatically fall back to providing a **stubbed transcript** after a short simulated delay.

-----

### 5\) Common Commands

| Task | Command | Notes |
| :--- | :--- | :--- |
| **Start Server** | `npm start` | Runs in tunnel mode by default. |
| **Clear Cache** | `npx expo start -c` | Use if bundler gets stuck or shows unexpected errors. |
| **Type Check** | `npm run typecheck` | Requires TypeScript setup. |
| **Lint** | `npm run lint` | Run the configured linter. |

-----

### 6\) Troubleshooting (Fast Fixes)

| Issue | Solution |
| :--- | :--- |
| **Bundler stuck** / **Red screen** | Run `npx expo start -c` |
| **Can't record** | Confirm mic permission in OS settings; try deleting and reinstalling the app on the simulator. |
| **Transcription never finishes** | **Leave `GEMINI_API_KEY` blank** in `.env` to test the UI flow using mock data. |
| **New code not picked up** | Fully quit the app on the device/simulator, then relaunch from the Expo terminal. |
| **Android device offline** | Restart the emulator from Android Studio. |
| **Data issues** / **Entries lost** | This should not happen with **Secure Storage** enabled, but if it does, check the console for errors from `SecureJournalProvider`. |

-----

### 7\) Next Steps

  * **Architecture**: Read the next document (e.g., `02-architecture.md`) to understand how services, providers, and UI pieces connect.
  * **Feature Flows**: Consult the feature-specific guides (e.g., `03-feature-flows/`).
  * **Release Builds**: See the guide on EAS if you need to create a test build.
  