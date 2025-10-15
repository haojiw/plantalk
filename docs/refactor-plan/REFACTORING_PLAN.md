# Plantalk Refactoring Plan

## Overview
This document outlines a safe, incremental refactoring strategy to reorganize the Plantalk codebase without breaking functionality. Each phase includes validation steps to ensure stability.

**Guiding Principles:**
- ✅ Move in small, testable increments
- ✅ Validate after each phase
- ✅ Keep app running throughout refactoring
- ✅ No new features - only reorganization
- ✅ Update imports progressively

---

## Phase 0: Pre-Refactoring Setup (30 mins)

### Step 0.1: Create Directory Structure
Create the new `src/` folder structure without moving any files yet.

```bash
# Core structure
mkdir -p src/core/providers
mkdir -p src/core/services/ai
mkdir -p src/core/services/storage
mkdir -p src/core/services/audio

# Features structure
mkdir -p src/features/recording/components
mkdir -p src/features/recording/hooks
mkdir -p src/features/journal/components
mkdir -p src/features/journal/hooks
mkdir -p src/features/journal/utils
mkdir -p src/features/entry-detail/components
mkdir -p src/features/entry-detail/hooks
mkdir -p src/features/audio-player/components
mkdir -p src/features/audio-player/hooks

# Shared structure
mkdir -p src/shared/components/layout
mkdir -p src/shared/hooks
mkdir -p src/shared/utils/formatters
mkdir -p src/shared/utils/helpers
mkdir -p src/shared/types
mkdir -p src/shared/constants

# Styles structure
mkdir -p src/styles/theme
```

**Validation:** Verify all directories exist.

---

### Step 0.2: Update TypeScript Configuration
Update `tsconfig.json` with new path aliases.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@/src/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/core/*": ["./src/core/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

**Validation:** Run `npm start` - app should still work with old paths.

---

## Phase 1: Move Shared Code First (2 hours)

### Step 1.1: Move Types
Types have no dependencies, safest to move first.

```bash
# Move
types/journal.ts → src/shared/types/journal.types.ts
```

**Create barrel export:** `src/shared/types/index.ts`
```typescript
export * from './journal.types';
```

**Update imports in:**
- `context/SecureJournalProvider.tsx`
- `services/DataValidationService.ts`
- All other files importing from `@/types/journal`

**Find affected files:**
```bash
grep -r "from '@/types/journal'" .
```

**Validation:** 
- App compiles without errors
- Test adding/viewing an entry

---

### Step 1.2: Move Shared Hooks
These hooks have minimal dependencies.

```bash
# Move
hooks/useColorScheme.ts     → src/shared/hooks/useColorScheme.ts
hooks/useColorScheme.web.ts → src/shared/hooks/useColorScheme.web.ts
hooks/useThemeColor.ts      → src/shared/hooks/useThemeColor.ts
```

**Create barrel export:** `src/shared/hooks/index.ts`
```typescript
export { useColorScheme } from './useColorScheme';
export { useThemeColor } from './useThemeColor';
```

**Update imports in:**
- All files importing these hooks (check with grep)

**Validation:** App compiles, UI renders correctly

---

### Step 1.3: Move Styles
```bash
# Move
styles/theme.ts → src/styles/theme.ts
```

**Update imports:**
```bash
grep -r "from '@/styles/theme'" .
# Update each file
```

**Validation:** UI styling intact

---

### Step 1.4: Move Utils
```bash
# Move
utils/audioPath.ts → src/shared/utils/audioPath.ts
```

**Create barrel export:** `src/shared/utils/index.ts`
```typescript
export * from './audioPath';
```

**Update imports in:**
- `context/SecureJournalProvider.tsx`
- `services/SpeechService.ts`
- `components/AudioPathMigration.tsx`

**Validation:** Audio playback works

---

### Step 1.5: Move Shared Components
```bash
# Move
components/ScreenWrapper.tsx     → src/shared/components/layout/ScreenWrapper.tsx
components/ParallaxScrollView.tsx → src/shared/components/layout/ParallaxScrollView.tsx
components/ExternalLink.tsx      → src/shared/components/ExternalLink.tsx
components/HapticTab.tsx         → src/shared/components/HapticTab.tsx
components/ui/                   → src/shared/components/ui/
```

**Create barrel export:** `src/shared/components/layout/index.ts`
```typescript
export { ScreenWrapper } from './ScreenWrapper';
export { ParallaxScrollView } from './ParallaxScrollView';
```

**Update imports:** Search and replace

**Validation:** All screens render correctly

---

## Phase 2: Move Core Services (3 hours)

### Step 2.1: Move Storage Services
```bash
# Move (order matters - least dependencies first)
services/SecureStorageService.ts    → src/core/services/storage/SecureStorageService.ts
services/DataValidationService.ts   → src/core/services/storage/DataValidationService.ts
services/DatabaseService.ts         → src/core/services/storage/DatabaseService.ts
services/BackupService.ts           → src/core/services/storage/BackupService.ts
```

**Create barrel export:** `src/core/services/storage/index.ts`
```typescript
export { secureStorageService } from './SecureStorageService';
export { dataValidationService } from './DataValidationService';
export { databaseService } from './DatabaseService';
export { backupService } from './BackupService';
```

**Update imports in:**
- `context/SecureJournalProvider.tsx`
- `components/AudioPathMigration.tsx`

**Validation:** 
- Test entry creation
- Test backup/restore
- Check secure storage operations

---

### Step 2.2: Move AI Services
```bash
# Move
services/SpeechService.ts         → src/core/services/ai/GeminiClient.ts
services/TextService.ts           → src/core/services/ai/RefinementService.ts
services/TranscriptionService.ts  → src/core/services/ai/TranscriptionService.ts
```

**Note:** Rename during move for clarity:
- `SpeechService` → `GeminiClient` (more descriptive)
- `TextService` → `RefinementService` (more descriptive)

**Create barrel export:** `src/core/services/ai/index.ts`
```typescript
export { geminiClient } from './GeminiClient';
export { refinementService } from './RefinementService';
export { transcriptionService } from './TranscriptionService';
```

**Update imports and variable names:**
- Change `speechService` → `geminiClient` where used
- Change `textService` → `refinementService` where used

**Validation:**
- Test voice recording
- Test transcription pipeline
- Verify AI-generated titles work

---

## Phase 3: Refactor SecureJournalProvider (4-5 hours)

This is the most complex phase. Break the 917-line provider into logical modules.

### Step 3.1: Extract Audio File Management
Create a new service for audio operations.

**Create:** `src/core/services/audio/AudioFileManager.ts`

**Extract from SecureJournalProvider:**
```typescript
- ensureAudioDirectoryExists()
- moveAudioToPermanentStorage()
- cleanupOrphanedAudio()
```

**Structure:**
```typescript
class AudioFileManager {
  async ensureAudioDirectoryExists(): Promise<void>
  async moveAudioToPermanentStorage(tempAudioUri: string): Promise<string>
  async cleanupOrphanedAudio(currentEntries: JournalEntry[]): Promise<void>
}

export const audioFileManager = new AudioFileManager();
```

**Validation:** Audio operations still work

---

### Step 3.2: Extract Initialization Logic
Create initialization module.

**Create:** `src/core/providers/journal/initialization.ts`

**Extract from SecureJournalProvider:**
```typescript
- initializeSecureStorage()
- performMigrationFromOldStorage()
- loadState()
```

**Structure:**
```typescript
export async function initializeSecureStorage(): Promise<InitResult>
export async function performMigrationFromOldStorage(): Promise<void>
export async function loadState(): Promise<JournalState>
```

**Validation:** App initialization works, migration still functions

---

### Step 3.3: Extract Entry Operations
Create entry operations module.

**Create:** `src/core/providers/journal/entryOperations.ts`

**Extract from SecureJournalProvider:**
```typescript
- addEntry()
- deleteEntry()
- updateEntry()
- updateEntryTranscription()
- updateEntryProgress()
```

**Structure:**
```typescript
export async function addEntry(
  entryData: Omit<JournalEntry, 'id'>,
  currentState: JournalState
): Promise<JournalEntry>

export async function deleteEntry(
  entryId: string,
  currentState: JournalState
): Promise<void>

export async function updateEntry(
  entryId: string,
  updates: Partial<JournalEntry>
): Promise<void>

// ... etc
```

**Validation:** CRUD operations work

---

### Step 3.4: Extract Backup & Diagnostics Operations
Create backup operations module.

**Create:** `src/core/providers/journal/backupOperations.ts`

**Extract from SecureJournalProvider:**
```typescript
- performHealthCheck()
- createBackup()
- restoreFromBackup()
- getBackupList()
- forceSync()
```

**Create:** `src/core/providers/journal/diagnosticsOperations.ts`

**Extract from SecureJournalProvider:**
```typescript
- runStorageDiagnostics()
- emergencyRecovery()
```

**Validation:** Backup/restore functionality works

---

### Step 3.5: Extract Context Types
Create types module for provider.

**Create:** `src/core/providers/journal/types.ts`

**Extract from SecureJournalProvider:**
```typescript
- SecureJournalContextType interface
- SecureJournalProviderProps interface
```

---

### Step 3.6: Create Refactored Provider
Create new modular provider.

**Create:** `src/core/providers/journal/SecureJournalProvider.tsx`

**Structure:**
```typescript
// Imports from extracted modules
import { initializeSecureStorage, loadState } from './initialization';
import { addEntry, deleteEntry, updateEntry } from './entryOperations';
import { performHealthCheck, createBackup } from './backupOperations';
import { runStorageDiagnostics, emergencyRecovery } from './diagnosticsOperations';
import { SecureJournalContextType, SecureJournalProviderProps } from './types';

// Slimmed down provider (~150 lines)
// Just manages state and delegates to operations
export const SecureJournalProvider: React.FC<SecureJournalProviderProps> = ({ children }) => {
  const [state, setState] = useState<JournalState>(...);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialization effect
  useEffect(() => {
    const init = async () => {
      const result = await initializeSecureStorage();
      // ... handle result
      setState(await loadState());
      setIsInitialized(true);
    };
    init();
  }, []);

  // Wrap operations with state management
  const handleAddEntry = async (entryData) => {
    await addEntry(entryData, state);
    setState(await loadState());
  };

  // ... other operations

  const contextValue: SecureJournalContextType = {
    state,
    isLoading,
    isInitialized,
    addEntry: handleAddEntry,
    deleteEntry: handleDeleteEntry,
    // ... other methods
  };

  return (
    <SecureJournalContext.Provider value={contextValue}>
      {children}
    </SecureJournalContext.Provider>
  );
};
```

---

### Step 3.7: Create Barrel Export for Provider
**Create:** `src/core/providers/journal/index.ts`
```typescript
export { SecureJournalProvider, useSecureJournal } from './SecureJournalProvider';
export type { SecureJournalContextType } from './types';
```

**Create:** `src/core/providers/index.ts`
```typescript
export * from './journal';
```

---

### Step 3.8: Update Provider Import in App Layout
Update `app/_layout.tsx`:
```typescript
// Old
import { SecureJournalProvider } from '@/context/SecureJournalProvider';

// New
import { SecureJournalProvider } from '@/core/providers';
```

**Validation:**
- Full app functionality test
- Create entry
- Edit entry
- Delete entry
- Test backup
- Test diagnostics
- Verify transcription

---

### Step 3.9: Remove Old Provider
Only after full validation:
```bash
# Delete old file
rm context/SecureJournalProvider.tsx
rmdir context  # if empty
```

---

## Phase 4: Move Feature-Specific Code (3 hours)

### Step 4.1: Recording Feature
```bash
# Move
hooks/useRecorder.ts           → src/features/recording/hooks/useRecorder.ts
components/Waveform.tsx        → src/features/recording/components/Waveform.tsx
app/record.tsx                 → app/(modals)/record.tsx  # Reorganize route
```

**Create:** `src/features/recording/index.ts`
```typescript
export { useRecorder } from './hooks/useRecorder';
export { Waveform } from './components/Waveform';
```

**Update imports in:**
- `app/(modals)/record.tsx`
- `app/(tabs)/index.tsx`

**Validation:** Recording functionality works

---

### Step 4.2: Audio Player Feature
```bash
# Move
hooks/useAudioPlayer.ts        → src/features/audio-player/hooks/useAudioPlayer.ts
components/AudioPlayer.tsx     → src/features/audio-player/components/AudioPlayer.tsx
```

**Create:** `src/features/audio-player/index.ts`
```typescript
export { useAudioPlayer } from './hooks/useAudioPlayer';
export { AudioPlayer } from './components/AudioPlayer';
```

**Update imports in:**
- `app/entry/[id].tsx`
- Other consumers

**Validation:** Audio playback works

---

### Step 4.3: Journal Feature
```bash
# Move
components/EntryItem.tsx       → src/features/journal/components/EntryItem.tsx
components/HistoryList.tsx     → src/features/journal/components/HistoryList.tsx
components/HistoryHeader.tsx   → src/features/journal/components/HistoryHeader.tsx
```

**Create:** `src/features/journal/index.ts`
```typescript
export { EntryItem } from './components/EntryItem';
export { HistoryList } from './components/HistoryList';
export { HistoryHeader } from './components/HistoryHeader';
```

**Update imports in:**
- `app/(tabs)/journal.tsx`
- `app/(tabs)/index.tsx`

**Validation:** Journal list displays correctly

---

### Step 4.4: Entry Detail Feature
```bash
# Move
hooks/useEntryEditor.ts           → src/features/entry-detail/hooks/useEntryEditor.ts
hooks/useEntryOptions.ts          → src/features/entry-detail/hooks/useEntryOptions.ts
hooks/useDateRevealAnimation.ts   → src/features/entry-detail/hooks/useDateRevealAnimation.ts
components/EntryContent.tsx       → src/features/entry-detail/components/EntryContent.tsx
components/EntryDetailHeader.tsx  → src/features/entry-detail/components/EntryDetailHeader.tsx
```

**Create:** `src/features/entry-detail/index.ts`
```typescript
export { useEntryEditor } from './hooks/useEntryEditor';
export { useEntryOptions } from './hooks/useEntryOptions';
export { useDateRevealAnimation } from './hooks/useDateRevealAnimation';
export { EntryContent } from './components/EntryContent';
export { EntryDetailHeader } from './components/EntryDetailHeader';
```

**Update imports in:**
- `app/entry/[id].tsx`

**Validation:** Entry detail page works, editing works

---

## Phase 5: Cleanup (1 hour)

### Step 5.1: Remove Old Directories
After all validations pass:
```bash
# Verify these are empty first
rmdir hooks
rmdir components
rmdir services
rmdir context
rmdir types
rmdir utils
rmdir styles
```

---

### Step 5.2: Update Documentation
Update README.md with new structure reference.

---

### Step 5.3: Remove Migration Component
```bash
# If AudioPathMigration is no longer needed:
rm components/AudioPathMigration.tsx
# Or move to src/core/services/audio/ if still needed
```

---

## Validation Checklist

After each phase, test these core flows:

### ✅ Recording Flow
- [ ] Start recording
- [ ] Stop recording
- [ ] Save entry with audio
- [ ] Audio file saved correctly

### ✅ Transcription Flow
- [ ] Entry shows "Processing..."
- [ ] Transcription completes
- [ ] AI title generated
- [ ] Entry updates in list

### ✅ Journal Flow
- [ ] View all entries
- [ ] Entries sorted correctly
- [ ] Tap to view detail
- [ ] Swipe to delete

### ✅ Entry Detail Flow
- [ ] View entry details
- [ ] Play audio
- [ ] Edit title/text
- [ ] Save changes
- [ ] Delete entry

### ✅ Backup & Storage Flow
- [ ] Create backup
- [ ] Restore from backup
- [ ] Health check runs
- [ ] Diagnostics runs

---

## Rollback Strategy

If any phase breaks functionality:

1. **Keep Git commits small** - one phase per commit
2. **Tag stable points**: 
   ```bash
   git tag phase-1-complete
   git tag phase-2-complete
   ```
3. **Rollback if needed**:
   ```bash
   git reset --hard phase-N-complete
   ```

---

## File Mapping Reference

Quick reference for where everything goes:

### Services
| Old Path | New Path |
|----------|----------|
| `services/DatabaseService.ts` | `src/core/services/storage/DatabaseService.ts` |
| `services/SecureStorageService.ts` | `src/core/services/storage/SecureStorageService.ts` |
| `services/BackupService.ts` | `src/core/services/storage/BackupService.ts` |
| `services/DataValidationService.ts` | `src/core/services/storage/DataValidationService.ts` |
| `services/TranscriptionService.ts` | `src/core/services/ai/TranscriptionService.ts` |
| `services/SpeechService.ts` | `src/core/services/ai/GeminiClient.ts` |
| `services/TextService.ts` | `src/core/services/ai/RefinementService.ts` |

### Context/Providers
| Old Path | New Path |
|----------|----------|
| `context/SecureJournalProvider.tsx` | `src/core/providers/journal/SecureJournalProvider.tsx` |
| | `src/core/providers/journal/initialization.ts` |
| | `src/core/providers/journal/entryOperations.ts` |
| | `src/core/providers/journal/backupOperations.ts` |
| | `src/core/providers/journal/diagnosticsOperations.ts` |
| | `src/core/providers/journal/types.ts` |

### Hooks
| Old Path | New Path |
|----------|----------|
| `hooks/useRecorder.ts` | `src/features/recording/hooks/useRecorder.ts` |
| `hooks/useAudioPlayer.ts` | `src/features/audio-player/hooks/useAudioPlayer.ts` |
| `hooks/useEntryEditor.ts` | `src/features/entry-detail/hooks/useEntryEditor.ts` |
| `hooks/useEntryOptions.ts` | `src/features/entry-detail/hooks/useEntryOptions.ts` |
| `hooks/useDateRevealAnimation.ts` | `src/features/entry-detail/hooks/useDateRevealAnimation.ts` |
| `hooks/useColorScheme.ts` | `src/shared/hooks/useColorScheme.ts` |
| `hooks/useThemeColor.ts` | `src/shared/hooks/useThemeColor.ts` |

### Components
| Old Path | New Path |
|----------|----------|
| `components/Waveform.tsx` | `src/features/recording/components/Waveform.tsx` |
| `components/AudioPlayer.tsx` | `src/features/audio-player/components/AudioPlayer.tsx` |
| `components/EntryItem.tsx` | `src/features/journal/components/EntryItem.tsx` |
| `components/HistoryList.tsx` | `src/features/journal/components/HistoryList.tsx` |
| `components/HistoryHeader.tsx` | `src/features/journal/components/HistoryHeader.tsx` |
| `components/EntryContent.tsx` | `src/features/entry-detail/components/EntryContent.tsx` |
| `components/EntryDetailHeader.tsx` | `src/features/entry-detail/components/EntryDetailHeader.tsx` |
| `components/ScreenWrapper.tsx` | `src/shared/components/layout/ScreenWrapper.tsx` |
| `components/ParallaxScrollView.tsx` | `src/shared/components/layout/ParallaxScrollView.tsx` |
| `components/ui/*` | `src/shared/components/ui/*` |

### Other
| Old Path | New Path |
|----------|----------|
| `types/journal.ts` | `src/shared/types/journal.types.ts` |
| `utils/audioPath.ts` | `src/shared/utils/audioPath.ts` |
| `styles/theme.ts` | `src/styles/theme.ts` |

---

## Estimated Timeline

- **Phase 0:** 30 minutes (setup)
- **Phase 1:** 2 hours (shared code)
- **Phase 2:** 3 hours (core services)
- **Phase 3:** 4-5 hours (provider refactor - most complex)
- **Phase 4:** 3 hours (features)
- **Phase 5:** 1 hour (cleanup)

**Total:** ~13-14 hours of focused work

**Recommended approach:** 
- Spread over 2-3 days
- Complete 1-2 phases per session
- Validate thoroughly between sessions

---

## Success Criteria

Refactoring is complete when:
- [ ] All files in new locations
- [ ] All imports updated
- [ ] Old directories removed
- [ ] App fully functional
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] All features tested and working
- [ ] Code is more maintainable
- [ ] Clear separation of concerns
- [ ] Easy to find files

---

## Notes

- **Don't rush Phase 3** - The SecureJournalProvider refactor is critical
- **Test audio paths carefully** - They've been problematic before
- **Keep backups** - Have a backup before starting
- **One commit per step** - Makes rollback easier
- **Update docs as you go** - Don't leave it for the end

