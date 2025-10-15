# Plantalk Architecture Diagram

## 📐 Directory Structure Overview

```
plantalk/
│
├── app/                                    # 🗺️ Routes (Expo Router)
│   ├── _layout.tsx                         # Root layout, wraps with providers
│   ├── (tabs)/                            # Tab navigation group
│   │   ├── _layout.tsx
│   │   ├── index.tsx                      # Home/Record tab
│   │   ├── journal.tsx                    # Journal list tab
│   │   └── insights.tsx                   # Insights tab
│   ├── (modals)/                          # Modal screens group
│   │   └── record.tsx                     # Recording modal
│   └── entry/
│       └── [id].tsx                       # Entry detail page
│
├── src/                                    # 🏗️ All source code
│   │
│   ├── core/                              # 🎯 Core infrastructure
│   │   │
│   │   ├── providers/                     # React context providers
│   │   │   └── journal/
│   │   │       ├── index.ts               # Public exports
│   │   │       ├── SecureJournalProvider.tsx    # Main provider
│   │   │       ├── SecureJournalContext.tsx     # Context definition
│   │   │       ├── types.ts                     # TypeScript types
│   │   │       ├── operations/
│   │   │       │   ├── entryOperations.ts       # Entry CRUD
│   │   │       │   ├── backupOperations.ts      # Backup/restore
│   │   │       │   ├── diagnosticsOperations.ts # Diagnostics
│   │   │       │   └── streakOperations.ts      # Streak logic
│   │   │       └── initialization/
│   │   │           ├── initializeServices.ts    # Service setup
│   │   │           ├── migrationService.ts      # Data migration
│   │   │           └── stateLoader.ts           # State loading
│   │   │
│   │   └── services/                      # Core business logic
│   │       ├── ai/
│   │       │   ├── index.ts
│   │       │   ├── GeminiClient.ts              # Gemini API client
│   │       │   ├── TranscriptionService.ts      # Audio → Text
│   │       │   └── RefinementService.ts         # Text refinement
│   │       │
│   │       ├── storage/
│   │       │   ├── index.ts
│   │       │   ├── DatabaseService.ts           # SQLite operations
│   │       │   ├── SecureStorageService.ts      # Encrypted storage
│   │       │   ├── BackupService.ts             # Backup/restore
│   │       │   └── DataValidationService.ts     # Data validation
│   │       │
│   │       └── audio/
│   │           ├── index.ts
│   │           └── AudioFileManager.ts          # Audio file operations
│   │
│   ├── features/                          # 🎨 Feature modules
│   │   │
│   │   ├── recording/                     # Voice recording
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   └── Waveform.tsx
│   │   │   └── hooks/
│   │   │       └── useRecorder.ts
│   │   │
│   │   ├── audio-player/                  # Audio playback
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   └── AudioPlayer.tsx
│   │   │   └── hooks/
│   │   │       └── useAudioPlayer.ts
│   │   │
│   │   ├── journal/                       # Journal list
│   │   │   ├── index.ts
│   │   │   └── components/
│   │   │       ├── EntryItem.tsx
│   │   │       ├── HistoryList.tsx
│   │   │       └── HistoryHeader.tsx
│   │   │
│   │   └── entry-detail/                  # Entry detail
│   │       ├── index.ts
│   │       ├── components/
│   │       │   ├── EntryContent.tsx
│   │       │   └── EntryDetailHeader.tsx
│   │       └── hooks/
│   │           ├── useEntryEditor.ts
│   │           ├── useEntryOptions.ts
│   │           └── useDateRevealAnimation.ts
│   │
│   ├── shared/                            # 🔧 Shared utilities
│   │   │
│   │   ├── components/                    # Reusable UI
│   │   │   ├── layout/
│   │   │   │   ├── index.ts
│   │   │   │   ├── ScreenWrapper.tsx
│   │   │   │   └── ParallaxScrollView.tsx
│   │   │   ├── ui/
│   │   │   │   ├── IconSymbol.tsx
│   │   │   │   └── TabBarBackground.tsx
│   │   │   ├── ExternalLink.tsx
│   │   │   └── HapticTab.tsx
│   │   │
│   │   ├── hooks/                         # Reusable hooks
│   │   │   ├── index.ts
│   │   │   ├── useColorScheme.ts
│   │   │   └── useThemeColor.ts
│   │   │
│   │   ├── utils/                         # Utility functions
│   │   │   ├── index.ts
│   │   │   └── audioPath.ts
│   │   │
│   │   └── types/                         # Shared types
│   │       ├── index.ts
│   │       └── journal.types.ts
│   │
│   └── styles/                            # 🎨 Styling system
│       └── theme.ts
│
├── assets/                                 # 📦 Static assets
│   ├── images/
│   └── fonts/
│
├── docs/                                   # 📚 Documentation
└── scripts/                                # 🛠️ Utility scripts
```

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          App Layer                              │
│                      (app/_layout.tsx)                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         SecureJournalProvider (Context)                   │ │
│  │         Provides: state, operations                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│              ┌─────────────┼─────────────┐                     │
│              ▼             ▼             ▼                      │
│         (tabs)/       (modals)/      entry/[id]                │
│       index.tsx      record.tsx                                │
│      journal.tsx                                               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ useSecureJournal()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Layer                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SecureJournalProvider (Orchestrator)                    │  │
│  │  - Manages state                                         │  │
│  │  - Delegates to operations                               │  │
│  │  - Provides context                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │          │           │            │                  │
│          ▼          ▼           ▼            ▼                  │
│    ┌─────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐            │
│    │ Entry   │ │ Backup │ │Diagnostics│ │ Streak  │            │
│    │   Ops   │ │  Ops   │ │   Ops     │ │  Ops    │            │
│    └─────────┘ └────────┘ └──────────┘ └─────────┘            │
│          │          │           │                               │
│          └──────────┴───────────┴─────────┐                    │
│                                            ▼                     │
│                                  ┌─────────────────┐            │
│                                  │    Services     │            │
│                                  │                 │            │
│                                  │  AI Storage     │            │
│                                  │  Audio          │            │
│                                  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Systems                              │
│                                                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│   │  Gemini  │   │  SQLite  │   │File System│                  │
│   │   API    │   │ Database │   │  (Audio)  │                  │
│   └──────────┘   └──────────┘   └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Import Dependency Rules

### ✅ Allowed Imports

```
┌──────────────────────────────────────────────────────────┐
│                      app/ (Routes)                       │
│                           ↓                              │
│         Can import from: EVERYTHING                      │
│         - features/*                                     │
│         - core/*                                         │
│         - shared/*                                       │
│         - styles/*                                       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  features/* (Features)                   │
│                           ↓                              │
│         Can import from:                                 │
│         - shared/*        ✅                             │
│         - core/providers  ✅                             │
│         - core/services   ✅                             │
│         - styles/*        ✅                             │
│                                                          │
│         CANNOT import from:                              │
│         - other features  ❌                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   core/* (Core)                          │
│                           ↓                              │
│         Can import from:                                 │
│         - shared/*        ✅                             │
│         - other core/*    ✅                             │
│                                                          │
│         CANNOT import from:                              │
│         - features/*      ❌                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  shared/* (Shared)                       │
│                           ↓                              │
│         Can import from:                                 │
│         - other shared/*  ✅                             │
│         - external deps   ✅                             │
│                                                          │
│         CANNOT import from:                              │
│         - core/*          ❌                             │
│         - features/*      ❌                             │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Import Path Examples

### Before Refactoring (❌ Old)
```typescript
// Scattered, unclear organization
import { JournalEntry } from '@/types/journal';
import { databaseService } from '@/services/DatabaseService';
import { useSecureJournal } from '@/context/SecureJournalProvider';
import { useRecorder } from '@/hooks/useRecorder';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { theme } from '@/styles/theme';
```

### After Refactoring (✅ New)
```typescript
// Clear, organized by layer
import { JournalEntry } from '@/shared/types';
import { databaseService } from '@/core/services/storage';
import { useSecureJournal } from '@/core/providers';
import { useRecorder } from '@/features/recording';
import { AudioPlayer } from '@/features/audio-player';
import { ScreenWrapper } from '@/shared/components/layout';
import { theme } from '@/src/styles/theme';
```

---

## 🏛️ Layer Responsibilities

### **App Layer** (`app/`)
- **Responsibility:** Routing, navigation, screen composition
- **Contains:** Route components only
- **Imports:** Everything (top of the hierarchy)
- **Exports:** Nothing (entry point)

### **Features Layer** (`src/features/`)
- **Responsibility:** User-facing functionality
- **Contains:** Feature-specific components, hooks, utils
- **Imports:** Shared, Core
- **Exports:** Public feature API via barrel exports
- **Rule:** Features CANNOT import from other features

### **Core Layer** (`src/core/`)
- **Responsibility:** Infrastructure, cross-cutting concerns
- **Contains:** Providers, services, global state
- **Imports:** Shared
- **Exports:** Core infrastructure
- **Rule:** Core CANNOT import from features

### **Shared Layer** (`src/shared/`)
- **Responsibility:** Reusable utilities used by 3+ modules
- **Contains:** Generic components, hooks, utils, types
- **Imports:** Only external packages
- **Exports:** Reusable utilities
- **Rule:** Shared CANNOT import from core or features

---

## 🎯 Feature Module Pattern

Each feature follows this structure:

```
features/feature-name/
├── index.ts                 # Public API - ONLY export what's needed
├── components/              # UI components
│   ├── Component1.tsx
│   └── Component2.tsx
├── hooks/                   # Feature-specific hooks
│   └── useFeature.ts
├── utils/                   # Feature-specific utilities
│   └── helpers.ts
└── types.ts                 # Feature-specific types (if needed)
```

**Public API (index.ts):**
```typescript
// Only export what other parts of app need
export { Component1 } from './components/Component1';
export { useFeature } from './hooks/useFeature';
// Component2 is internal, not exported
```

**Usage:**
```typescript
// Clean import from feature
import { Component1, useFeature } from '@/features/feature-name';

// NOT allowed (bypasses public API)
import { Component2 } from '@/features/feature-name/components/Component2'; // ❌
```

---

## 🔐 SecureJournalProvider Architecture

### Before (Monolithic)
```
SecureJournalProvider.tsx (917 lines)
├── State management
├── Initialization
├── Audio file management
├── Entry CRUD
├── Transcription updates
├── Backup operations
├── Diagnostics
├── Migration logic
├── Streak calculations
└── Context provision
```

### After (Modular)
```
src/core/providers/journal/
├── SecureJournalProvider.tsx          (150 lines) - Orchestrator
├── SecureJournalContext.tsx           (30 lines)  - Context
├── types.ts                           (50 lines)  - Types
│
├── operations/
│   ├── entryOperations.ts             (200 lines) - Entry CRUD
│   ├── backupOperations.ts            (100 lines) - Backup/restore
│   ├── diagnosticsOperations.ts       (200 lines) - Health checks
│   └── streakOperations.ts            (50 lines)  - Streak logic
│
└── initialization/
    ├── initializeServices.ts          (100 lines) - Setup
    ├── migrationService.ts            (150 lines) - Migration
    └── stateLoader.ts                 (50 lines)  - State loading
```

**Benefits:**
- Each file has single responsibility
- Easy to test operations in isolation
- Clear separation of concerns
- Average file size: ~115 lines
- Much easier to maintain

---

## 📊 Service Interactions

```
┌─────────────────────────────────────────────────────────┐
│              Entry Creation Flow                        │
└─────────────────────────────────────────────────────────┘

User action (Record audio)
    │
    ▼
app/record.tsx
    │ uses useRecorder()
    ▼
features/recording/hooks/useRecorder.ts
    │ calls addEntry()
    ▼
core/providers/journal/SecureJournalProvider
    │ delegates to
    ▼
core/providers/journal/operations/entryOperations.ts
    │ calls multiple services
    ├──▶ core/services/audio/AudioFileManager.ts
    │    └──▶ Move audio to permanent storage
    │
    ├──▶ core/services/storage/DataValidationService.ts
    │    └──▶ Validate entry
    │
    ├──▶ core/services/storage/DatabaseService.ts
    │    └──▶ Save to database
    │
    └──▶ core/services/ai/TranscriptionService.ts
         └──▶ Start transcription pipeline
              │
              ├──▶ core/services/ai/GeminiClient.ts
              │    └──▶ Convert audio to text
              │
              └──▶ core/services/ai/RefinementService.ts
                   └──▶ Refine and generate title
```

---

## 🧩 Component Hierarchy

```
App Root (app/_layout.tsx)
│
├─ SecureJournalProvider                    (Core)
│  └─ Provides: journal state & operations
│
└─ Navigation (Expo Router)
   │
   ├─ (tabs)/
   │  ├─ index.tsx                          (Home/Record)
   │  │  ├─ ScreenWrapper                   (Shared)
   │  │  ├─ HistoryHeader                   (Feature: journal)
   │  │  ├─ HistoryList                     (Feature: journal)
   │  │  │  └─ EntryItem                    (Feature: journal)
   │  │  └─ [Record Button] → record.tsx
   │  │
   │  └─ journal.tsx                        (Journal List)
   │     ├─ ScreenWrapper                   (Shared)
   │     └─ HistoryList                     (Feature: journal)
   │        └─ EntryItem                    (Feature: journal)
   │
   ├─ (modals)/
   │  └─ record.tsx                         (Recording Modal)
   │     ├─ useRecorder                     (Feature: recording)
   │     └─ Waveform                        (Feature: recording)
   │
   └─ entry/[id].tsx                        (Entry Detail)
      ├─ ScreenWrapper                      (Shared)
      ├─ EntryDetailHeader                  (Feature: entry-detail)
      ├─ EntryContent                       (Feature: entry-detail)
      │  ├─ useEntryEditor                  (Feature: entry-detail)
      │  └─ useEntryOptions                 (Feature: entry-detail)
      └─ AudioPlayer                        (Feature: audio-player)
         └─ useAudioPlayer                  (Feature: audio-player)
```

---

## 🎨 Visual Layers

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     app/ (Routes)                           │
│                     Expo Router                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              features/ (User-Facing)                        │
│              recording | journal | entry-detail             │
│              audio-player                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           core/ (Infrastructure)                            │
│           providers | services                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│        shared/ (Reusable Utilities)                         │
│        components | hooks | utils | types                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│            External Dependencies                            │
│            React Native | Expo | Gemini API                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Imports flow DOWNWARD only ↓
Higher layers can import from lower layers
Lower layers CANNOT import from higher layers
```

---

## 🔍 Finding Files - Quick Reference

### "Where do I find...?"

| What | Where |
|------|-------|
| **Routes/Screens** | `app/` |
| **Journal list component** | `src/features/journal/components/` |
| **Recording functionality** | `src/features/recording/` |
| **Audio playback** | `src/features/audio-player/` |
| **Entry detail components** | `src/features/entry-detail/components/` |
| **Database operations** | `src/core/services/storage/DatabaseService.ts` |
| **AI/Transcription** | `src/core/services/ai/` |
| **Journal state management** | `src/core/providers/journal/` |
| **Reusable UI components** | `src/shared/components/` |
| **Utility functions** | `src/shared/utils/` |
| **Type definitions** | `src/shared/types/` |
| **Theme/Styling** | `src/styles/theme.ts` |

---

## 🚀 Benefits Summary

### Maintainability
- ✅ Clear ownership and boundaries
- ✅ Easy to locate functionality
- ✅ Predictable file structure
- ✅ Small, focused files (<200 lines)

### Scalability
- ✅ Easy to add new features
- ✅ Features don't interfere with each other
- ✅ Can enable/disable features independently
- ✅ Team can work on different features without conflicts

### Testability
- ✅ Can test features in isolation
- ✅ Can mock dependencies easily
- ✅ Operations are pure functions
- ✅ Clear interfaces between layers

### Developer Experience
- ✅ Intuitive file organization
- ✅ Faster navigation
- ✅ Better IDE performance
- ✅ Clearer import statements
- ✅ Reduced cognitive load

---

## 📝 Import Cheat Sheet

```typescript
// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
import { JournalEntry, JournalState } from '@/shared/types';

// ═══════════════════════════════════════════════════
// CORE - Providers
// ═══════════════════════════════════════════════════
import { useSecureJournal } from '@/core/providers';

// ═══════════════════════════════════════════════════
// CORE - Services
// ═══════════════════════════════════════════════════
// Storage
import { 
  databaseService, 
  secureStorageService, 
  backupService,
  dataValidationService 
} from '@/core/services/storage';

// AI
import { 
  geminiClient,
  transcriptionService,
  refinementService 
} from '@/core/services/ai';

// Audio
import { audioFileManager } from '@/core/services/audio';

// ═══════════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════════
// Recording
import { useRecorder, Waveform } from '@/features/recording';

// Audio Player
import { useAudioPlayer, AudioPlayer } from '@/features/audio-player';

// Journal
import { 
  EntryItem, 
  HistoryList, 
  HistoryHeader 
} from '@/features/journal';

// Entry Detail
import { 
  useEntryEditor,
  useEntryOptions,
  EntryContent,
  EntryDetailHeader 
} from '@/features/entry-detail';

// ═══════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════
// Components
import { ScreenWrapper } from '@/shared/components/layout';
import { IconSymbol } from '@/shared/components/ui';

// Hooks
import { useColorScheme, useThemeColor } from '@/shared/hooks';

// Utils
import { 
  getAbsoluteAudioPath, 
  getRelativeAudioPath 
} from '@/shared/utils';

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
import { theme } from '@/src/styles/theme';
```

---

This architecture provides a solid foundation for scaling Plantalk while keeping it maintainable and testable! 🎉

