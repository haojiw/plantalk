# Refactoring Quick Start Guide

This is a condensed, actionable guide to execute the refactoring. See `REFACTORING_PLAN.md` for full details.

---

## ⚡ Before You Start

### Prerequisites
```bash
# 1. Ensure you're on main branch with clean state
git status

# 2. Create a refactoring branch
git checkout -b refactor/organized-architecture

# 3. Create a backup
cp -r /Users/haoji/Projects/plantalk ~/Desktop/plantalk-backup-$(date +%Y%m%d)

# 4. Make sure app runs
npm start
# Test: Create entry, view entry, delete entry
```

### Quick Test Commands
```bash
# Start app
npm start

# Check for TypeScript errors
npx tsc --noEmit

# Check imports
grep -r "from '@/" app/
```

---

## 📋 Execution Checklist

### Phase 0: Setup (30 mins)
```bash
# Create all directories at once
mkdir -p src/{core/{providers/journal/{operations,initialization,hooks},services/{ai,storage,audio}},features/{recording,journal,entry-detail,audio-player}/{components,hooks,utils},shared/{components/{layout,ui,buttons,inputs,feedback},hooks,utils/{formatters,helpers},types,constants},styles/theme}

# Verify structure
tree src/ -L 3
```

**Update tsconfig.json:**
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
  }
}
```

✅ **Checkpoint:** `npm start` - app still works

---

### Phase 1: Shared Code (2 hours)

#### 1.1 Types
```bash
# Move
git mv types/journal.ts src/shared/types/journal.types.ts

# Create barrel
cat > src/shared/types/index.ts << 'EOF'
export * from './journal.types';
EOF

# Update imports (run this to see what needs updating)
grep -r "from '@/types/journal'" app/ components/ services/ context/ hooks/
```

**Update imports:**
- `@/types/journal` → `@/shared/types`

✅ **Test:** App compiles, create/view entry works

---

#### 1.2 Utils
```bash
# Move
git mv utils/audioPath.ts src/shared/utils/audioPath.ts

# Create barrel
cat > src/shared/utils/index.ts << 'EOF'
export * from './audioPath';
EOF

# Find affected files
grep -r "from '@/utils/audioPath'" .
```

**Update imports:**
- `@/utils/audioPath` → `@/shared/utils`

✅ **Test:** Audio playback works

---

#### 1.3 Styles
```bash
# Move
git mv styles/theme.ts src/styles/theme.ts

# Update imports
grep -r "from '@/styles/theme'" .
```

**Update imports:**
- `@/styles/theme` → `@/src/styles/theme`

✅ **Test:** UI renders correctly

---

#### 1.4 Shared Hooks
```bash
# Move
git mv hooks/useColorScheme.ts src/shared/hooks/
git mv hooks/useColorScheme.web.ts src/shared/hooks/
git mv hooks/useThemeColor.ts src/shared/hooks/

# Create barrel
cat > src/shared/hooks/index.ts << 'EOF'
export { useColorScheme } from './useColorScheme';
export { useThemeColor } from './useThemeColor';
EOF

# Find affected files
grep -r "from '@/hooks/useColorScheme\|useThemeColor'" .
```

**Update imports:**
- `@/hooks/useColorScheme` → `@/shared/hooks`
- `@/hooks/useThemeColor` → `@/shared/hooks`

✅ **Test:** UI styling works

---

#### 1.5 Shared Components
```bash
# Move layout components
git mv components/ScreenWrapper.tsx src/shared/components/layout/
git mv components/ParallaxScrollView.tsx src/shared/components/layout/
git mv components/ExternalLink.tsx src/shared/components/
git mv components/HapticTab.tsx src/shared/components/

# Move UI components
git mv components/ui/ src/shared/components/

# Create barrel exports
cat > src/shared/components/layout/index.ts << 'EOF'
export { ScreenWrapper } from './ScreenWrapper';
export { ParallaxScrollView } from './ParallaxScrollView';
EOF

# Find what needs updating
grep -r "from '@/components/ScreenWrapper\|ParallaxScrollView'" .
```

**Update imports:**
- `@/components/ScreenWrapper` → `@/shared/components/layout`
- Same for other components

✅ **Test:** All screens render

---

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor(phase-1): move shared code to src/shared"
git tag phase-1-complete
```

---

### Phase 2: Core Services (3 hours)

#### 2.1 Storage Services
```bash
# Move (order matters!)
git mv services/SecureStorageService.ts src/core/services/storage/
git mv services/DataValidationService.ts src/core/services/storage/
git mv services/DatabaseService.ts src/core/services/storage/
git mv services/BackupService.ts src/core/services/storage/

# Create barrel
cat > src/core/services/storage/index.ts << 'EOF'
export { secureStorageService } from './SecureStorageService';
export { dataValidationService } from './DataValidationService';
export { databaseService } from './DatabaseService';
export { backupService } from './BackupService';
EOF

# Find affected files
grep -r "from '@/services/.*Service'" .
```

**Update imports in:**
- `context/SecureJournalProvider.tsx`
- `components/AudioPathMigration.tsx`

**Old → New:**
- `@/services/DatabaseService` → `@/core/services/storage`
- `@/services/SecureStorageService` → `@/core/services/storage`
- etc.

✅ **Test:** Create entry, backup/restore

---

#### 2.2 AI Services
```bash
# Move (note: we're renaming for clarity)
git mv services/SpeechService.ts src/core/services/ai/GeminiClient.ts
git mv services/TextService.ts src/core/services/ai/RefinementService.ts
git mv services/TranscriptionService.ts src/core/services/ai/TranscriptionService.ts

# Create barrel
cat > src/core/services/ai/index.ts << 'EOF'
export { geminiClient } from './GeminiClient';
export { refinementService } from './RefinementService';
export { transcriptionService } from './TranscriptionService';
EOF
```

**Update imports AND variable names:**
- `speechService` → `geminiClient`
- `textService` → `refinementService`

✅ **Test:** Record audio, transcription works

---

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor(phase-2): move services to src/core/services"
git tag phase-2-complete
```

---

### Phase 3: SecureJournalProvider (4-5 hours)

**⚠️ MOST COMPLEX PHASE - Go Slow**

See `SECUREJOURNALPROVIDER_REFACTOR.md` for detailed instructions.

#### Quick Steps:
1. Create types file
2. Create context file  
3. Extract operations (one at a time):
   - streakOperations.ts
   - entryOperations.ts
   - backupOperations.ts
   - diagnosticsOperations.ts
4. Extract initialization:
   - stateLoader.ts
   - initializeServices.ts
   - migrationService.ts
5. Create new provider
6. Create barrel exports
7. Test side-by-side (keep old provider)
8. Switch to new provider
9. Delete old provider

✅ **Test EVERYTHING:**
- Create entry
- Edit entry
- Delete entry
- Transcription
- Backup/restore
- Diagnostics
- App restart

---

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor(phase-3): restructure SecureJournalProvider into modules"
git tag phase-3-complete
```

---

### Phase 4: Feature-Specific Code (3 hours)

#### 4.1 Recording Feature
```bash
# Move
git mv hooks/useRecorder.ts src/features/recording/hooks/
git mv components/Waveform.tsx src/features/recording/components/

# Create barrel
cat > src/features/recording/index.ts << 'EOF'
export { useRecorder } from './hooks/useRecorder';
export { Waveform } from './components/Waveform';
EOF

# Find affected
grep -r "from '@/hooks/useRecorder\|@/components/Waveform'" .
```

**Update imports:**
- `@/hooks/useRecorder` → `@/features/recording`
- `@/components/Waveform` → `@/features/recording`

✅ **Test:** Recording works

---

#### 4.2 Audio Player Feature
```bash
git mv hooks/useAudioPlayer.ts src/features/audio-player/hooks/
git mv components/AudioPlayer.tsx src/features/audio-player/components/

cat > src/features/audio-player/index.ts << 'EOF'
export { useAudioPlayer } from './hooks/useAudioPlayer';
export { AudioPlayer } from './components/AudioPlayer';
EOF
```

✅ **Test:** Audio playback

---

#### 4.3 Journal Feature
```bash
git mv components/EntryItem.tsx src/features/journal/components/
git mv components/HistoryList.tsx src/features/journal/components/
git mv components/HistoryHeader.tsx src/features/journal/components/

cat > src/features/journal/index.ts << 'EOF'
export { EntryItem } from './components/EntryItem';
export { HistoryList } from './components/HistoryList';
export { HistoryHeader } from './components/HistoryHeader';
EOF
```

✅ **Test:** Journal list

---

#### 4.4 Entry Detail Feature
```bash
git mv hooks/useEntryEditor.ts src/features/entry-detail/hooks/
git mv hooks/useEntryOptions.ts src/features/entry-detail/hooks/
git mv hooks/useDateRevealAnimation.ts src/features/entry-detail/hooks/
git mv components/EntryContent.tsx src/features/entry-detail/components/
git mv components/EntryDetailHeader.tsx src/features/entry-detail/components/

cat > src/features/entry-detail/index.ts << 'EOF'
export { useEntryEditor } from './hooks/useEntryEditor';
export { useEntryOptions } from './hooks/useEntryOptions';
export { useDateRevealAnimation } from './hooks/useDateRevealAnimation';
export { EntryContent } from './components/EntryContent';
export { EntryDetailHeader } from './components/EntryDetailHeader';
EOF
```

✅ **Test:** Entry detail page

---

**Git Checkpoint:**
```bash
git add .
git commit -m "refactor(phase-4): organize feature-specific code"
git tag phase-4-complete
```

---

### Phase 5: Cleanup (1 hour)

```bash
# Verify old directories are empty
ls hooks/
ls components/
ls services/
ls context/
ls types/
ls utils/
ls styles/

# Remove empty directories
rmdir hooks components services context types utils styles 2>/dev/null || echo "Some directories not empty - check what's left"

# List what's left
find . -maxdepth 1 -type d ! -name "." ! -name ".." ! -name "node_modules" ! -name ".git" ! -name "app" ! -name "src" ! -name "assets" ! -name "docs" ! -name "scripts"
```

**Final structure should look like:**
```
plantalk/
├── app/           # Routes only
├── src/           # All source code
│   ├── core/
│   ├── features/
│   └── shared/
├── assets/
├── docs/
└── scripts/
```

---

**Final Git Checkpoint:**
```bash
git add .
git commit -m "refactor(phase-5): cleanup old directories"
git tag refactor-complete

# Push
git push origin refactor/organized-architecture
git push --tags
```

---

## 🧪 Final Validation

### Smoke Test
```bash
# Clean install
rm -rf node_modules
npm install
npm start
```

### Feature Test Matrix

| Feature | Test | Status |
|---------|------|--------|
| Recording | Record 10sec audio | ⬜ |
| Entry Creation | Save with audio | ⬜ |
| Transcription | Wait for completion | ⬜ |
| AI Title | Verify generated | ⬜ |
| Journal List | View all entries | ⬜ |
| Entry Detail | Open & view | ⬜ |
| Edit Entry | Modify title/text | ⬜ |
| Delete Entry | Remove entry | ⬜ |
| Audio Playback | Play audio | ⬜ |
| Backup | Create backup | ⬜ |
| Restore | Restore from backup | ⬜ |
| Diagnostics | Run health check | ⬜ |
| App Restart | Close & reopen | ⬜ |
| Data Persistence | Verify data remains | ⬜ |

---

## 🚨 Troubleshooting

### App Won't Start
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for missing imports
grep -r "from '@/" app/ src/

# Verify all index.ts barrels exist
find src/ -name "index.ts" -ls
```

### Import Errors
```bash
# Find all remaining old imports
grep -r "from '@/services/\|@/context/\|@/types/\|@/hooks/\|@/components/" app/ src/

# Should return nothing (only app/ uses old structure)
```

### Audio Issues
```bash
# Check audio paths
grep -r "getAbsoluteAudioPath\|getRelativeAudioPath" src/
# Should all be in src/shared/utils/audioPath.ts or src/core/services/audio/
```

### State Not Updating
Check that all operations call `reloadState()` callback:
```typescript
// Bad
export async function addEntry(data) { }

// Good
export async function addEntry(data, onStateChange) {
  // ... do work
  await onStateChange();
}
```

---

## 📊 Progress Tracker

Track your progress:

```bash
# Phase 0: Setup
[ ] Directories created
[ ] tsconfig.json updated
[ ] App still runs

# Phase 1: Shared
[ ] Types moved
[ ] Utils moved
[ ] Styles moved
[ ] Hooks moved
[ ] Components moved
[ ] All imports updated
[ ] Tests pass

# Phase 2: Services
[ ] Storage services moved
[ ] AI services moved
[ ] All imports updated
[ ] Tests pass

# Phase 3: Provider
[ ] Types extracted
[ ] Context extracted
[ ] Operations extracted
[ ] Initialization extracted
[ ] New provider created
[ ] Tested side-by-side
[ ] Old provider removed
[ ] Tests pass

# Phase 4: Features
[ ] Recording feature moved
[ ] Audio player feature moved
[ ] Journal feature moved
[ ] Entry detail feature moved
[ ] All imports updated
[ ] Tests pass

# Phase 5: Cleanup
[ ] Old directories removed
[ ] Documentation updated
[ ] Final validation
[ ] Git tags created
```

---

## ⏱️ Time Estimates

- **Fast (experienced):** 8 hours
- **Normal:** 13 hours
- **Careful (recommended):** 16 hours

Spread over 2-3 days for best results.

---

## 🎯 Success Metrics

You're done when:

✅ **Structure**
- All code in `src/`
- Old directories removed
- Clean barrel exports

✅ **Functionality**
- All features work
- No console errors
- No TypeScript errors

✅ **Maintainability**
- Files < 200 lines
- Clear organization
- Easy to find things

✅ **Documentation**
- README updated
- Comments preserved
- Import paths clear

---

## 🆘 Need Help?

If stuck:
1. Check `REFACTORING_PLAN.md` for details
2. Check `SECUREJOURNALPROVIDER_REFACTOR.md` for provider details
3. Rollback to last tag: `git reset --hard phase-N-complete`
4. Check git diff: `git diff phase-N-complete`

---

## 📝 Post-Refactoring

After completion:
1. Update README with new structure
2. Update any setup docs
3. Document new import patterns
4. Share with team
5. Celebrate! 🎉

