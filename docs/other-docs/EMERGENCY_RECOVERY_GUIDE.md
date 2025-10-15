# Emergency Recovery Guide

## Problem Summary

After updating to the new secure storage system (`SecureJournalProvider`), all your previous journal entries disappeared. This happened because:

1. **Old System**: Data was stored in `entries.json` (plain JSON file)
2. **New System**: Data is stored in `plantalk.db` (encrypted SQLite database)
3. **Migration Issue**: The automatic migration ran but didn't properly transfer your data from `entries.json` to the database

## What Was Fixed

### 1. Emergency Recovery Function
Added `emergencyRecovery()` method to `SecureJournalProvider.tsx` that:
- Checks if the old `entries.json` file still exists
- Reads all entries from the legacy storage
- Validates and fixes corrupted entries if needed
- Imports entries into the new SQLite database (avoiding duplicates)
- Updates app state (streak, last entry date)
- Creates a backup after successful recovery
- Provides detailed status feedback

**Location**: `context/SecureJournalProvider.tsx` (lines 575-672)

### 2. Emergency Recovery Button
Added a prominent red "🚨 Emergency Recovery" button to the Insights page that:
- Shows a confirmation dialog before running recovery
- Displays progress indicator while recovering
- Shows success/failure message with details
- Is disabled during recovery to prevent multiple runs

**Location**: `components/AudioPathMigration.tsx`

## How to Recover Your Data

### Step 1: Open the App
Launch your PlantTalk app on your device or simulator.

### Step 2: Navigate to Insights Tab
Tap on the Insights tab at the bottom of the screen.

### Step 3: Scroll to Recovery Section
Scroll down to find the recovery buttons (where "Migrate Audio Paths" button is).

### Step 4: Tap "🚨 Emergency Recovery"
You'll see a red button labeled "🚨 Emergency Recovery" at the top of the section.

### Step 5: Confirm Recovery
A dialog will appear asking "This will attempt to recover your entries from the old storage file (entries.json). Continue?"
- Tap **"Recover"** to proceed
- Tap **"Cancel"** if you want to wait

### Step 6: Wait for Completion
The button will show a loading spinner. Wait for the process to complete.

### Step 7: Check Results
You'll see one of these messages:

#### ✅ Success
```
Recovery Successful ✅
Successfully recovered X entries from legacy storage.

Your entries should now be visible in the journal.
```
→ Go to your Journal tab and verify your entries are back!

#### ❌ No Legacy Data Found
```
Recovery Failed
No legacy data found at entries.json. Your data may have been lost during migration.
```
→ The old file doesn't exist or was already deleted

#### ❌ Empty File
```
Recovery Failed
Legacy file exists but contains 0 entries.
```
→ The old file exists but has no entries in it

## Troubleshooting

### Recovery Says "No legacy data found"
This could mean:
1. The migration actually worked, but the data was cleared from the database
2. The `entries.json` file was deleted
3. You're running on a different simulator/device than before

**What to do**:
1. Check if you have any backups in the app (Insights → Backup section)
2. Look for backup files on your device
3. If you exported data previously, import it back

### Recovery Says "0 entries recovered"
This means:
- The old file was found but is empty
- OR all entries from the old file already exist in the new database

**What to do**:
1. Check the Journal tab to see if entries are actually there
2. Try the "Force Sync" button to reload the state
3. Check console logs for more details

### Recovery Fails with Error
Check the console logs for detailed error messages:
```javascript
[SecureJournalProvider] Emergency recovery failed: [error details]
```

## How the Recovery Works

```typescript
// The recovery process:
1. Checks if entries.json exists
2. Reads the old data structure
3. Validates each entry
4. Fixes corrupted entries if possible
5. Compares with current database (avoids duplicates)
6. Imports missing entries
7. Updates app state (streak, last entry)
8. Creates automatic backup
9. Reloads the journal state
```

## Prevention for Future

The migration code now includes better error handling and logging. If you ever need to switch devices or reinstall:

1. **Always create a backup first**: Insights → Create Backup
2. **Export your data**: Use the sharing feature to save a copy
3. **Verify migration**: After any update, check that your entries are visible

## Technical Details

### Files Modified
1. `context/SecureJournalProvider.tsx`
   - Added `emergencyRecovery()` method
   - Added to context interface

2. `components/AudioPathMigration.tsx`
   - Added emergency recovery button
   - Added recovery state management
   - Updated UI to show both buttons

### What Gets Recovered
- ✅ All journal entries (id, date, title, text, etc.)
- ✅ Audio file references (if files still exist)
- ✅ Streak count
- ✅ Last entry date
- ✅ Entry metadata (duration, processing status, etc.)

### What Doesn't Get Recovered
- ❌ Deleted entries (if they were deleted before the migration)
- ❌ Audio files that were physically deleted
- ❌ Temporary data or cache

## Console Logging

During recovery, watch for these log messages:

```
[SecureJournalProvider] Starting emergency recovery...
[SecureJournalProvider] Found X entries in legacy storage
[SecureJournalProvider] Fixing corrupted entries during recovery...
[SecureJournalProvider] Emergency recovery completed: X entries recovered
```

## Need More Help?

If recovery doesn't work:
1. Check the console logs in Metro bundler or Xcode
2. Look for the `entries.json` file manually in your file system
3. Check if you have any backup files
4. Contact support with the error logs

---

**Created**: October 8, 2025
**Version**: 1.0
**Related Files**: 
- `context/SecureJournalProvider.tsx`
- `components/AudioPathMigration.tsx`

