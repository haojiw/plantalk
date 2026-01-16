import { JournalEntry, JournalState } from '@/shared/types';
import { getAbsoluteAudioPath } from '@/shared/utils';

import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { secureStorageService } from './SecureStorageService';

interface DatabaseEntry extends Omit<JournalEntry, 'id'> {
  id?: number; // SQLite auto-increment ID
  entryId: string; // Our custom string ID
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
}

interface DatabaseMetadata {
  streak: number;
  lastEntryISO: string | null;
  totalEntries: number;
  createdAt: string;
  updatedAt: string;
}

export type OutboxStatus = 'pending_upload' | 'uploading' | 'processing' | 'failed';

export interface TranscriptionOutboxEntry {
  id: string;
  local_uri: string;
  status: OutboxStatus;
  server_job_id: string | null;
  created_at: number;
  retry_count: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private static readonly DB_NAME = 'plantalk.db';
  private static readonly DB_VERSION = 1;

  // Initialize database connection and create tables
  async initialize(): Promise<void> {
    try {
      console.log('[DatabaseService] Initializing database...');
      
      // Create secure database directory - for now, store in document directory
      // Note: The database will be created in the default location
      console.log('[DatabaseService] Database will be created in default location');
      
      // Open database connection
      this.db = await SQLite.openDatabaseAsync(DatabaseService.DB_NAME);

      // Enable foreign keys and WAL mode for better performance and consistency
      await this.db.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 10000;
        PRAGMA temp_store = memory;
      `);

      await this.createTables();
      await this.runMigrations();
      
      console.log('[DatabaseService] Database initialized successfully');
    } catch (error) {
      console.error('[DatabaseService] Failed to initialize database:', error);
      throw error;
    }
  }

  // Create database tables
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Entries table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entryId TEXT UNIQUE NOT NULL,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          text TEXT NOT NULL,
          rawText TEXT,
          audioUri TEXT,
          duration INTEGER,
          processingStage TEXT,
          encrypted BOOLEAN DEFAULT FALSE,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          UNIQUE(entryId)
        );
      `);

      // Index for faster queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
        CREATE INDEX IF NOT EXISTS idx_entries_entryId ON entries(entryId);
        CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(createdAt);
      `);

      // Metadata table for app state
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS metadata (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          streak INTEGER NOT NULL DEFAULT 0,
          lastEntryISO TEXT,
          totalEntries INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);

      // Insert default metadata if not exists
      await this.db.execAsync(`
        INSERT OR IGNORE INTO metadata (id, streak, lastEntryISO, totalEntries, createdAt, updatedAt)
        VALUES (1, 0, NULL, 0, datetime('now'), datetime('now'));
      `);

      // Transcription outbox table for reliable transcription processing
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS transcription_outbox (
          id TEXT PRIMARY KEY,
          local_uri TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending_upload',
          server_job_id TEXT,
          created_at INTEGER NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Index for faster outbox queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_outbox_status ON transcription_outbox(status);
      `);

      console.log('[DatabaseService] Tables created successfully');
    } catch (error) {
      console.error('[DatabaseService] Failed to create tables:', error);
      throw error;
    }
  }

  // Handle database migrations for future versions
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get current database version from user_version pragma
      const result = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const currentVersion = result?.user_version || 0;

      if (currentVersion < DatabaseService.DB_VERSION) {
        console.log(`[DatabaseService] Running migrations from version ${currentVersion} to ${DatabaseService.DB_VERSION}`);
        
        // Add future migrations here
        // if (currentVersion < 2) {
        //   await this.db.execAsync('ALTER TABLE entries ADD COLUMN newColumn TEXT;');
        // }

        // Update database version
        await this.db.execAsync(`PRAGMA user_version = ${DatabaseService.DB_VERSION}`);
        console.log('[DatabaseService] Migrations completed');
      }
    } catch (error) {
      console.error('[DatabaseService] Migration failed:', error);
      throw error;
    }
  }

  // Add new entry to database
  async addEntry(entry: JournalEntry): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      
      // Encrypt sensitive data if needed
      let text = entry.text;
      let rawText = entry.rawText || '';
      let encrypted = false;

      // You can choose to encrypt the text content for additional security
      // if (entry.text.length > 0) {
      //   text = await secureStorageService.encrypt(entry.text);
      //   encrypted = true;
      // }

      await this.db.runAsync(`
        INSERT INTO entries (entryId, date, title, text, rawText, audioUri, duration, processingStage, encrypted, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entry.id,
        entry.date,
        entry.title,
        text,
        rawText,
        entry.audioUri || null,
        entry.duration || null,
        entry.processingStage || 'completed',
        encrypted,
        now,
        now
      ]);

      // Update metadata
      await this.updateMetadata();
      
      console.log(`[DatabaseService] Added entry: ${entry.id}`);
    } catch (error) {
      console.error('[DatabaseService] Failed to add entry:', error);
      throw error;
    }
  }

  // Update existing entry
  async updateEntry(entryId: string, updates: Partial<JournalEntry>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      const fields: string[] = [];
      const values: any[] = [];

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      fields.push('updatedAt = ?');
      values.push(now);
      values.push(entryId);

      await this.db.runAsync(`
        UPDATE entries SET ${fields.join(', ')}
        WHERE entryId = ?
      `, values);

      console.log(`[DatabaseService] Updated entry: ${entryId}`);
    } catch (error) {
      console.error('[DatabaseService] Failed to update entry:', error);
      throw error;
    }
  }

  // Delete entry from database
  async deleteEntry(entryId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get the entry to find audio file
      const entry = await this.getEntry(entryId);
      
      // Delete from database
      await this.db.runAsync('DELETE FROM entries WHERE entryId = ?', [entryId]);
      
      // Delete audio file if exists
      if (entry?.audioUri) {
        try {
          const absolutePath = getAbsoluteAudioPath(entry.audioUri);
          if (absolutePath) {
            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
              await secureStorageService.secureDeleteFile(absolutePath);
            }
          }
        } catch (audioError) {
          console.error('[DatabaseService] Failed to delete audio file:', audioError);
        }
      }

      // Update metadata
      await this.updateMetadata();
      
      console.log(`[DatabaseService] Deleted entry: ${entryId}`);
    } catch (error) {
      console.error('[DatabaseService] Failed to delete entry:', error);
      throw error;
    }
  }

  // Get single entry by ID
  async getEntry(entryId: string): Promise<JournalEntry | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<DatabaseEntry>(`
        SELECT * FROM entries WHERE entryId = ?
      `, [entryId]);

      if (!result) return null;

      return this.convertDatabaseEntryToJournalEntry(result);
    } catch (error) {
      console.error('[DatabaseService] Failed to get entry:', error);
      return null;
    }
  }

  // Get all entries with optional pagination
  async getAllEntries(limit?: number, offset?: number): Promise<JournalEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = 'SELECT * FROM entries ORDER BY date DESC';
      const params: any[] = [];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const results = await this.db.getAllAsync<DatabaseEntry>(query, params);
      
      const entries = await Promise.all(
        results.map(result => this.convertDatabaseEntryToJournalEntry(result))
      );

      return entries;
    } catch (error) {
      console.error('[DatabaseService] Failed to get all entries:', error);
      return [];
    }
  }

  /**
   * Get entries by their processing stage (for resuming pending transcriptions)
   * @param stages - Array of processing stages to filter by
   * @returns Array of JournalEntry objects matching the specified stages
   */
  async getEntriesByProcessingStage(stages: ('transcribing' | 'refining' | 'completed' | 'transcribing_failed' | 'refining_failed')[]): Promise<JournalEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (stages.length === 0) {
        return [];
      }
      
      const placeholders = stages.map(() => '?').join(', ');
      const query = `SELECT * FROM entries WHERE processingStage IN (${placeholders}) ORDER BY createdAt ASC`;
      
      const results = await this.db.getAllAsync<DatabaseEntry>(query, stages);
      
      const entries = await Promise.all(
        results.map(result => this.convertDatabaseEntryToJournalEntry(result))
      );

      console.log(`[DatabaseService] Found ${entries.length} entries with processing stages: ${stages.join(', ')}`);
      return entries;
    } catch (error) {
      console.error('[DatabaseService] Failed to get entries by processing stage:', error);
      return [];
    }
  }

  // Get current app state/metadata
  async getAppState(): Promise<JournalState> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const metadata = await this.db.getFirstAsync<DatabaseMetadata>(`
        SELECT * FROM metadata WHERE id = 1
      `);

      const entries = await this.getAllEntries();

      return {
        streak: metadata?.streak || 0,
        lastEntryISO: metadata?.lastEntryISO || null,
        entries
      };
    } catch (error) {
      console.error('[DatabaseService] Failed to get app state:', error);
      return { streak: 0, lastEntryISO: null, entries: [] };
    }
  }

  // Update app metadata
  async updateAppState(state: Partial<Pick<JournalState, 'streak' | 'lastEntryISO'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = new Date().toISOString();
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(state).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
      });

      if (fields.length === 0) return;

      fields.push('updatedAt = ?');
      values.push(now);

      await this.db.runAsync(`
        UPDATE metadata SET ${fields.join(', ')} WHERE id = 1
      `, values);

      console.log('[DatabaseService] Updated app state');
    } catch (error) {
      console.error('[DatabaseService] Failed to update app state:', error);
      throw error;
    }
  }

  // Update metadata counts
  private async updateMetadata(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const countResult = await this.db.getFirstAsync<{ count: number }>(`
        SELECT COUNT(*) as count FROM entries
      `);

      const totalEntries = countResult?.count || 0;

      await this.db.runAsync(`
        UPDATE metadata SET totalEntries = ?, updatedAt = datetime('now') WHERE id = 1
      `, [totalEntries]);
    } catch (error) {
      console.error('[DatabaseService] Failed to update metadata:', error);
    }
  }

  // Convert database entry to JournalEntry format
  private async convertDatabaseEntryToJournalEntry(dbEntry: DatabaseEntry): Promise<JournalEntry> {
    let text = dbEntry.text;
    let rawText = dbEntry.rawText || '';

    // Decrypt if entry was encrypted
    if (dbEntry.encrypted) {
      try {
        text = await secureStorageService.getSecureFile(dbEntry.text) || text;
        if (rawText) {
          rawText = await secureStorageService.getSecureFile(rawText) || rawText;
        }
      } catch (error) {
        console.error('[DatabaseService] Failed to decrypt entry:', error);
      }
    }

    return {
      id: dbEntry.entryId,
      date: dbEntry.date,
      title: dbEntry.title,
      text,
      rawText,
      audioUri: dbEntry.audioUri || undefined,
      duration: dbEntry.duration || undefined,
      processingStage: dbEntry.processingStage as JournalEntry['processingStage']
    };
  }

  // Create database backup
  async createBackup(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${FileSystem.documentDirectory}backups/backup-${timestamp}.json`;
      
      // Ensure backup directory exists
      await secureStorageService.createSecureDirectory(`${FileSystem.documentDirectory}backups/`);
      
      const state = await this.getAppState();
      await secureStorageService.createSecureBackup(backupPath, state);
      
      console.log(`[DatabaseService] Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('[DatabaseService] Failed to create backup:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const state = await secureStorageService.restoreFromSecureBackup(backupPath);
      
      // Clear existing data
      await this.db.execAsync('DELETE FROM entries');
      
      // Restore entries
      for (const entry of state.entries) {
        await this.addEntry(entry);
      }
      
      // Restore metadata
      await this.updateAppState({
        streak: state.streak,
        lastEntryISO: state.lastEntryISO
      });
      
      console.log(`[DatabaseService] Restored from backup: ${backupPath}`);
    } catch (error) {
      console.error('[DatabaseService] Failed to restore from backup:', error);
      throw error;
    }
  }

  // Add a new entry to the transcription outbox
  async addToOutbox(uri: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const id = crypto.randomUUID();
      const createdAt = Date.now();

      await this.db.runAsync(`
        INSERT INTO transcription_outbox (id, local_uri, status, server_job_id, created_at, retry_count)
        VALUES (?, ?, 'pending_upload', NULL, ?, 0)
      `, [id, uri, createdAt]);

      console.log(`[DatabaseService] Added to outbox: ${id}`);
      return id;
    } catch (error) {
      console.error('[DatabaseService] Failed to add to outbox:', error);
      throw error;
    }
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('[DatabaseService] Database connection closed');
    }
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.getFirstAsync('SELECT 1');
      return true;
    } catch (error) {
      console.error('[DatabaseService] Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const databaseService = new DatabaseService();

// Convenience export for adding to transcription outbox
export const addToOutbox = (uri: string): Promise<string> => databaseService.addToOutbox(uri);
