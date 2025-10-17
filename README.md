# Plantalk 🌱

**A voice-first journal for effortless reflection and gentle growth.**


## The Problem: Journaling is Hard

We all have meaningful days we want to remember and fleeting creative ideas we wish we'd captured. The standard solution is journaling, but the friction is real. Typing out long thoughts is a chore, and unstructured voice memos get lost and are impossible to search. The result? Our most valuable reflections and ideas fade away.

## The Solution: Just Talk

**Plantalk** is designed to be the most frictionless way to journal. It removes the barrier of the blank page by letting you capture your thoughts as naturally as you think them: by speaking.

The core experience is simple:
1.  **You Talk:** Open the app and record a voice entry.
2.  **It Transcribes:** Using AI, your voice is converted into clean, organized text.
3.  **You Reflect:** Your entries are saved, sorted by date, and easy to revisit.

To help you build a consistent practice, Plantalk includes a virtual plant companion. When you journal, your plant thrives. It's a gentle, visual reminder of your commitment to your own growth and reflection.

## Core Features

* 🗣️ **Effortless Voice Recording:** Just press a button and speak your mind. No typing required.
* 🤖 **AI-Powered Transcription:** Your voice memos are automatically transcribed using **OpenAI's Whisper API**.
* ✨ **AI-Powered Refinement:** The raw transcription is then cleaned up, formatted into paragraphs, and given a relevant title by **Google's Gemini API**.
* 📔 **Organized Journal:** Browse all your entries chronologically in a clean, calm interface.
* 🪴 **Your Growth Companion:** Nurture a virtual plant that grows as you maintain your journaling habit—a beautiful metaphor for your personal growth.
* 🧠 **AI Insights (Coming Soon):** Future updates will provide weekly recaps, identify recurring themes in your entries, and offer personalized insights for deeper reflection.

## Tech Stack

* **Framework:** React Native / Expo
* **Navigation:** Expo Router
* **UI & Animations:** React Native Reanimated
* **Language:** TypeScript
* **AI Services:** OpenAI Whisper (Transcription), Google Gemini (Refinement & Titling)
* **Data Storage:** On-device storage via `expo-file-system` for privacy.

## Project Status

The app is currently available for testing via **TestFlight**. The core functionality of recording, transcribing, and viewing entries is complete. The next focus is on implementing the AI insights feature and preparing for an official App Store launch.

bruh