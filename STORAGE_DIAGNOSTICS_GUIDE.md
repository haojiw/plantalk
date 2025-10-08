# Storage Diagnostics Guide

## Overview

The **Storage Diagnostics** feature provides a comprehensive health check of your app's entire storage system. It runs 6 different tests to verify that everything is working correctly.

## How to Use

1. Open your PlantTalk app
2. Go to the **Insights** tab
3. Scroll down to find the diagnostic buttons
4. Tap **🔍 Run Storage Diagnostics** (blue button at the top)
5. Wait for the tests to complete (usually takes a few seconds)
6. Review the results in the alert dialog

## What Tests Are Run

### 1. **Database Connection Test** 🗄️

**What it checks:**
- Can the app connect to the SQLite database?
- Can it read the app state (entries, streak, etc.)?

**Pass Criteria:**
```
✅ Pass: Connected. X entries found, streak: Y
```

**Fail Conditions:**
```
❌ Fail: Cannot read database: [error message]
```

**What it means:**
- **Pass**: Database is accessible and readable
- **Fail**: Database file is corrupted, locked, or missing

---

### 2. **Secure Storage Test** 🔐

**What it checks:**
- Is secure storage (keychain/keystore) available?
- Can the app write encrypted data?
- Can the app read back encrypted data?
- Does the read value match what was written?

**Test Process:**
1. Writes a test value with timestamp
2. Reads it back immediately
3. Verifies the values match
4. Deletes the test data (cleanup)

**Pass Criteria:**
```
✅ Pass: Read/write operations successful
```

**Fail/Warning Conditions:**
```
⚠️ Warning: Read value does not match written value
❌ Fail: Secure storage not available on this device
❌ Fail: Error: [error message]
```

**What it means:**
- **Pass**: Encryption system is working correctly
- **Warning**: Data integrity issue with secure storage
- **Fail**: Device doesn't support secure storage or there's a system error

---

### 3. **Entries Validation Test** ✓

**What it checks:**
- Are all journal entries structurally valid?
- Do entries have required fields (id, date, text, etc.)?
- Are dates in valid ISO format?
- Are there any corrupted entries?

**Pass Criteria:**
```
✅ Pass: All X entries are valid
```

**Fail/Warning Conditions:**
```
⚠️ Warning: Found fixable issues: [list of issues]
❌ Fail: Critical issues: [list of issues]
```

**What it means:**
- **Pass**: All entries are properly formatted and complete
- **Warning**: Some entries have issues but can be auto-fixed
- **Fail**: Entries have critical corruption that requires manual intervention

---

### 4. **Audio Files Test** 🎵

**What it checks:**
- How many entries have audio recordings?
- Do the audio files actually exist on disk?
- Are audio paths in the correct format (relative paths)?
- Any broken references to missing files?

**Test Process:**
1. Finds all entries with audio references
2. Checks if paths are relative (e.g., `audio/audio_123.m4a`)
3. Verifies each file exists at the expected location
4. Counts existing vs. missing files

**Pass Criteria:**
```
✅ Pass: X/Y audio files found (Z using relative paths)
```

**Fail/Warning Conditions:**
```
⚠️ Warning: X files exist, Y missing
❌ Fail: All X audio files are missing
❌ Fail: Error checking files: [error message]
```

**What it means:**
- **Pass**: All audio files are accessible
- **Warning**: Some files are missing (might be deleted or moved)
- **Fail**: All audio files are gone or there's a file system error

---

### 5. **Backup System Test** 💾

**What it checks:**
- Is the backup system functional?
- Can it access the backup directory?
- How many backups exist?

**Pass Criteria:**
```
✅ Pass: Backup system operational. X backup(s) available
```

**Fail/Warning Conditions:**
```
⚠️ Warning: Cannot list backups: [error message]
```

**What it means:**
- **Pass**: Backup system is working and backups are available
- **Warning**: Backup system has issues but app still functions

---

### 6. **Migration Status Test** 🔄

**What it checks:**
- Has the migration from old storage completed?
- Does the old `entries.json` file still exist?
- How many entries are in the old file (if it exists)?

**Test Logic:**

| Migration Flag | Old File Exists | Result | Details |
|---------------|-----------------|--------|---------|
| ✅ Completed | ❌ No | ✅ Pass | Migration completed, old file removed |
| ✅ Completed | ✅ Yes | ⚠️ Warning | Migration completed, but old file still exists with X entries |
| ❌ Not completed | ✅ Yes | ❌ Fail | Migration not completed, old file exists |
| ❌ Not completed | ❌ No | ✅ Pass | No migration needed (fresh install) |

**What it means:**
- **Pass (completed + removed)**: Clean migration, all good
- **Warning (completed + exists)**: Migration ran but old file wasn't deleted (safe, but should use Emergency Recovery to ensure all data is migrated)
- **Fail (not completed + exists)**: Migration never ran! Use Emergency Recovery immediately
- **Pass (fresh install)**: New installation, no migration needed

---

## Understanding the Results

### Summary Line

The diagnostic will show one of these summaries:

#### 🎉 All Tests Passed
```
🎉 All tests passed! Storage system is healthy.
```
**Action:** None needed. Everything is working perfectly!

#### ⚠️ Warnings Present
```
⚠️ X passed, Y warnings. System is functional with minor issues.
```
**Action:** Review the warnings. System works but might benefit from:
- Running Emergency Recovery (if migration warning)
- Checking for missing audio files
- Creating a backup

#### ❌ Critical Failures
```
❌ X critical failures, Y warnings, Z passed. Action required.
```
**Action:** Immediate attention needed:
- If Database fails: Contact support, app may be unusable
- If Secure Storage fails: Device compatibility issue
- If Migration fails: Run Emergency Recovery button

### Detailed Results

Each test shows:
```
[Test Name]:
[Status Icon] [Details]
```

For example:
```
Database:
✅ Pass Connected. 25 entries found, streak: 5

Secure Storage:
✅ Pass Read/write operations successful

Entries:
✅ Pass All 25 entries are valid

Audio Files:
⚠️ Warning 20 files exist, 5 missing

Backup System:
✅ Pass Backup system operational. 3 backup(s) available

Migration:
⚠️ Warning Migration completed, but old file still exists with 25 entries
```

**Interpretation:**
- Database ✅: 25 entries loaded, streak tracking works
- Secure Storage ✅: Encryption working
- Entries ✅: No corrupted data
- Audio Files ⚠️: 5 audio files are missing (might have been deleted)
- Backups ✅: 3 backups available for restore
- Migration ⚠️: Old file still present - should run Emergency Recovery to ensure all data is migrated

---

## Troubleshooting Common Issues

### "Database: ❌ Fail"
**Problem:** Cannot connect to or read the database

**Solutions:**
1. Try the "Force Sync" button
2. Restart the app
3. If persists, restore from a backup
4. Contact support if no backups available

### "Secure Storage: ❌ Fail"
**Problem:** Device doesn't support secure storage or system error

**Solutions:**
1. Check iOS/Android version (requires iOS 10+ or Android 6+)
2. Restart device
3. Check device encryption settings
4. May need to reinstall app (export data first!)

### "Entries: ⚠️ Warning - fixable issues"
**Problem:** Some entries have minor corruption

**Solutions:**
1. Run "Health Check" from Insights page
2. Select "Run Auto-Fix"
3. Create a backup after fixing

### "Audio Files: ⚠️ Warning - X missing"
**Problem:** Some audio files were deleted or moved

**Solutions:**
1. Check if you manually deleted recordings
2. If unexpected, might be from app updates or migrations
3. Files are permanently gone, but transcriptions remain
4. Future recordings will be saved correctly

### "Migration: ❌ Fail - not completed"
**Problem:** You have old data that wasn't migrated

**Solutions:**
1. **Immediately** tap "Emergency Recovery" button
2. This will import your old entries
3. Verify entries appear in Journal tab
4. Run diagnostics again to confirm

### "Migration: ⚠️ Warning - old file exists"
**Problem:** Migration ran but old file is still there

**Solutions:**
1. Run "Emergency Recovery" to double-check all data migrated
2. Verify entry counts match between old and new
3. Old file can be manually deleted after verification

---

## Best Practices

### When to Run Diagnostics

Run diagnostics:
- ✅ After major app updates
- ✅ When entries seem to be missing
- ✅ Before creating important backups
- ✅ After restoring from backup
- ✅ When audio playback fails
- ✅ Monthly as preventive maintenance

### What to Do After Running Diagnostics

1. **If all pass:** Great! Create a backup for safety
2. **If warnings:** Address them, then create a backup
3. **If failures:** Fix critical issues before continuing to use the app

### Preventive Maintenance

Monthly routine:
1. Run Storage Diagnostics
2. Create a backup (with audio)
3. Review and fix any warnings
4. Delete old backups if you have many

---

## Technical Details

### What Gets Tested

| Test | Checks | Duration |
|------|--------|----------|
| Database | SQLite connectivity, query performance | ~100ms |
| Secure Storage | Keychain/Keystore read/write | ~200ms |
| Entries | Data validation, schema compliance | ~50ms per 100 entries |
| Audio Files | File system access, file existence | ~50ms per file |
| Backup System | Directory access, file listing | ~100ms |
| Migration | File checks, JSON parsing | ~100ms |

**Total time:** Usually 1-3 seconds depending on entry count

### What Doesn't Get Tested

- ❌ Network connectivity
- ❌ Transcription service functionality
- ❌ Audio recording quality
- ❌ UI rendering
- ❌ Push notifications

For these, use the general app features or contact support.

---

## Example Diagnostic Reports

### Perfect Health
```
Storage Diagnostics

🎉 All tests passed! Storage system is healthy.

Database:
✅ Pass Connected. 42 entries found, streak: 7

Secure Storage:
✅ Pass Read/write operations successful

Entries:
✅ Pass All 42 entries are valid

Audio Files:
✅ Pass 42/42 audio files found (42 using relative paths)

Backup System:
✅ Pass Backup system operational. 5 backup(s) available

Migration:
✅ Pass Migration completed, old file removed
```

### Needs Attention
```
Storage Diagnostics

⚠️ 4 passed, 2 warnings. System is functional with minor issues.

Database:
✅ Pass Connected. 0 entries found, streak: 0

Secure Storage:
✅ Pass Read/write operations successful

Entries:
✅ Pass All 0 entries are valid

Audio Files:
✅ Pass 0/0 audio files found (0 using relative paths)

Backup System:
⚠️ Warning Cannot list backups: Directory not found

Migration:
❌ Fail Migration not completed, old file exists

→ ACTION REQUIRED: Run Emergency Recovery!
```

---

**Created**: October 8, 2025  
**Version**: 1.0  
**Related Files**: 
- `context/SecureJournalProvider.tsx` (lines 587-783)
- `components/AudioPathMigration.tsx`

