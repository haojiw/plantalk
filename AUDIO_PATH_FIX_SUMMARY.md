# Audio Path Fix - Implementation Summary

## Problem Solved
Fixed audio recordings being lost after app updates through TestFlight. The issue was caused by iOS changing the app container UUID during updates, which invalidated absolute file paths stored in the database.

## Solution Overview
Converted audio file storage from **absolute paths** to **relative paths**:
- **Before**: `file:///var/.../ABC-123-OLD/Documents/audio/audio_123.m4a` ❌
- **After**: `audio/audio_123.m4a` ✅

Relative paths survive app updates because we reconstruct the absolute path at runtime using the current container location.

---

## Files Created

### 1. `/utils/audioPath.ts` - Audio Path Utility
Core helper functions for path conversion:

- **`getAbsoluteAudioPath()`** - Converts relative → absolute paths at runtime
- **`getRelativeAudioPath()`** - Converts absolute → relative paths for storage
- **`isRelativePath()`** - Checks if a path is relative
- **`getAudioDirectory()`** - Returns current audio directory path

### 2. `/components/AudioPathMigration.tsx` - Migration UI Component
User-friendly migration tool that:
- Scans all entries for audio files
- Identifies which ones need migration
- Shows stats (total, migrated, needs migration)
- Performs batch migration with error handling
- Located in Insights page → Developer Tools section

---

## Files Modified

### 3. `/context/SecureJournalProvider.tsx`
**Changes:**
- Imported audio path utilities
- Updated `moveAudioToPermanentStorage()` to return relative paths
- Updated `cleanupOrphanedAudio()` to work with relative paths
- Updated `deleteEntry()` to convert relative → absolute before deletion

**Key Change:**
```typescript
// Now returns: "audio/audio_123.m4a" instead of full path
const moveAudioToPermanentStorage = async (tempAudioUri: string): Promise<string> => {
  const relativePath = `audio/${filename}`;
  const absolutePath = getAbsoluteAudioPath(relativePath)!;
  await FileSystem.moveAsync({ from: tempAudioUri, to: absolutePath });
  return relativePath; // ← Stores relative path
}
```

### 4. `/services/DatabaseService.ts`
**Changes:**
- Imported `getAbsoluteAudioPath`
- Updated `deleteEntry()` to convert paths before file operations

### 5. `/hooks/useAudioPlayer.ts`
**Changes:**
- Imported `getAbsoluteAudioPath`
- Converts relative → absolute path before creating audio player

**Key Change:**
```typescript
const absoluteAudioUri = getAbsoluteAudioPath(audioUri);
const player = useExpoAudioPlayer(absoluteAudioUri ? { uri: absoluteAudioUri } : null);
```

### 6. `/hooks/useEntryOptions.ts`
**Changes:**
- Imported `getAbsoluteAudioPath`
- Updated `handleDownloadAudio()` to convert paths before file operations

### 7. `/components/AudioPlayer.tsx`
**Status:** ✅ No changes needed - receives URI from hook which handles conversion

### 8. `/app/(tabs)/insights.tsx`
**Changes:**
- Added import for `AudioPathMigration` component
- Added "Developer Tools" section with migration button
- Added styles for developer section

---

## How It Works

### For New Recordings:
1. Audio recorded → saved to temp location
2. `moveAudioToPermanentStorage()` moves file and returns `"audio/audio_123.m4a"`
3. Database stores: `"audio/audio_123.m4a"` (relative path)
4. ✅ **Survives app updates!**

### For Playback/Download:
1. Read from database: `"audio/audio_123.m4a"`
2. Call `getAbsoluteAudioPath()` → reconstructs with current container
3. Returns: `"file:///var/.../NEW-UUID/Documents/audio/audio_123.m4a"`
4. File operation succeeds ✅

### For Existing Audio Files:
1. User taps "Check & Migrate" button in Insights page
2. Component scans all entries, identifies absolute paths
3. Converts them to relative paths
4. Updates database
5. ✅ **Old recordings now survive updates too!**

---

## Migration Instructions for Users

### One-Time Migration (For Existing Users)
1. Open the app
2. Navigate to **Insights** tab
3. Scroll to **Developer Tools** section
4. Tap **"Check & Migrate"** button
5. Review the stats:
   - ✅ Already migrated (relative paths)
   - ⚠️ Need migration (absolute paths)
6. Tap **"Migrate"** to convert old paths
7. Done! Audio files will now survive app updates

### For Future Reference
- This button will be moved to Settings → Developer Tools page
- Migration is automatic for all new recordings
- One-time migration handles existing recordings

---

## Testing Checklist

### ✅ New Recordings
- [ ] Record a new entry
- [ ] Verify it saves successfully
- [ ] Check database stores relative path
- [ ] Play back the audio successfully
- [ ] Download the audio file successfully

### ✅ Existing Recordings (Post-Migration)
- [ ] Run migration tool
- [ ] Verify success message
- [ ] Play back old recordings
- [ ] Download old recordings
- [ ] Verify paths are now relative in database

### ✅ App Update Simulation
Since you can't easily simulate a container UUID change locally, test on TestFlight:
- [ ] Record entries in version N
- [ ] Submit version N+1 to TestFlight with this fix
- [ ] Install version N+1
- [ ] Run migration
- [ ] Verify all audio files still play ✅

---

## Technical Notes

### Why This Works
iOS automatically migrates files from old container to new container during app updates:
- **SQLite database**: `OLD/plantalk.db` → `NEW/plantalk.db` ✅
- **Audio files**: `OLD/audio/audio_123.m4a` → `NEW/audio/audio_123.m4a` ✅
- **Database content**: Strings inside database stay the same ✅

By storing just `"audio/audio_123.m4a"` instead of the full path, we can reconstruct the correct absolute path at runtime using `FileSystem.documentDirectory` which iOS automatically updates to the new container location.

### Backward Compatibility
The helper functions automatically detect path format:
```typescript
// Handles both formats gracefully
getAbsoluteAudioPath("audio/audio_123.m4a")              // ← New format
getAbsoluteAudioPath("file:///.../audio/audio_123.m4a")  // ← Old format (unchanged)
```

### Performance Impact
- **Minimal**: Path conversion is a simple string operation
- **No extra I/O**: No additional file system calls
- **Migration**: One-time operation per entry

---

## Future Improvements

1. **Settings Page**: Move migration button to Settings → Developer Tools
2. **Auto-Migration**: Consider running migration automatically on first launch after update
3. **Analytics**: Track how many users needed migration
4. **Export/Import**: Update backup/restore to handle both path formats

---

## Rollout Strategy

### Version N (Current - Before Fix)
- Audio paths stored as absolute
- ⚠️ Files lost after updates

### Version N+1 (With This Fix)
- **New recordings**: Automatically use relative paths ✅
- **Old recordings**: Need one-time migration
- **Migration UI**: Available in Insights page

### Version N+2 (Future)
- Consider auto-migration on app launch
- Move migration to Settings → Developer Tools
- Most users should be migrated by now

---

## Support

If users report issues:
1. Check if they ran the migration tool
2. Verify paths in database are relative
3. Check audio files exist in `Documents/audio/` directory
4. Check console logs for path conversion errors

---

**Status**: ✅ Complete and ready for testing
**Breaking Changes**: None (backward compatible)
**Migration Required**: Yes (one-time, user-initiated via UI)

