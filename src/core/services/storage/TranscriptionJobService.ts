import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

export type TranscriptionJobStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface TranscriptionJob {
  id: string;
  localUri: string;
  serverJobId: string | null;
  status: TranscriptionJobStatus;
  transcript: string | null;
  createdAt: number;
}

/**
 * Service for persisting transcription jobs to SQLite.
 * This allows the app to resume interrupted transcriptions after crashes or restarts.
 */
class TranscriptionJobService {
  private db: SQLite.SQLiteDatabase | null = null;
  private static readonly DB_NAME = 'transcription_jobs.db';

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      console.log('[TranscriptionJobService] Initializing database...');

      this.db = await SQLite.openDatabaseAsync(TranscriptionJobService.DB_NAME);

      // Enable WAL mode for better performance
      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
      `);

      await this.createTables();

      console.log('[TranscriptionJobService] Database initialized successfully');
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create the transcription_jobs table
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS transcription_jobs (
          id TEXT PRIMARY KEY NOT NULL,
          localUri TEXT NOT NULL,
          serverJobId TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          transcript TEXT,
          createdAt INTEGER NOT NULL
        );
      `);

      // Index for querying active jobs
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON transcription_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created ON transcription_jobs(createdAt);
      `);

      console.log('[TranscriptionJobService] Tables created successfully');
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Generate a UUID for new jobs
   */
  private generateUUID(): string {
    return Crypto.randomUUID();
  }

  /**
   * Add a new transcription job
   */
  async addJob(localUri: string): Promise<TranscriptionJob> {
    if (!this.db) throw new Error('Database not initialized');

    const job: TranscriptionJob = {
      id: this.generateUUID(),
      localUri,
      serverJobId: null,
      status: 'pending',
      transcript: null,
      createdAt: Date.now(),
    };

    try {
      await this.db.runAsync(
        `INSERT INTO transcription_jobs (id, localUri, serverJobId, status, transcript, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [job.id, job.localUri, job.serverJobId, job.status, job.transcript, job.createdAt]
      );

      console.log(`[TranscriptionJobService] Added job: ${job.id}`);
      return job;
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to add job:', error);
      throw error;
    }
  }

  /**
   * Update the status of a transcription job
   */
  async updateJobStatus(jobId: string, status: TranscriptionJobStatus): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE transcription_jobs SET status = ? WHERE id = ?`,
        [status, jobId]
      );

      console.log(`[TranscriptionJobService] Updated job ${jobId} status to: ${status}`);
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to update job status:', error);
      throw error;
    }
  }

  /**
   * Update the server job ID (returned from AssemblyAI)
   */
  async updateJobServerId(jobId: string, serverJobId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE transcription_jobs SET serverJobId = ? WHERE id = ?`,
        [serverJobId, jobId]
      );

      console.log(`[TranscriptionJobService] Updated job ${jobId} serverJobId to: ${serverJobId}`);
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to update server job ID:', error);
      throw error;
    }
  }

  /**
   * Save the final transcript and mark job as completed
   */
  async saveTranscript(jobId: string, transcript: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE transcription_jobs SET transcript = ?, status = 'completed' WHERE id = ?`,
        [transcript, jobId]
      );

      console.log(`[TranscriptionJobService] Saved transcript for job: ${jobId}`);
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to save transcript:', error);
      throw error;
    }
  }

  /**
   * Get all active (non-completed, non-failed) jobs
   * Returns jobs that are pending, uploading, or processing
   */
  async getActiveJobs(): Promise<TranscriptionJob[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync<TranscriptionJob>(
        `SELECT * FROM transcription_jobs 
         WHERE status IN ('pending', 'uploading', 'processing')
         ORDER BY createdAt ASC`
      );

      console.log(`[TranscriptionJobService] Found ${results.length} active jobs`);
      return results;
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to get active jobs:', error);
      return [];
    }
  }

  /**
   * Get a single job by ID
   */
  async getJob(jobId: string): Promise<TranscriptionJob | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<TranscriptionJob>(
        `SELECT * FROM transcription_jobs WHERE id = ?`,
        [jobId]
      );

      return result || null;
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to get job:', error);
      return null;
    }
  }

  /**
   * Delete a job by ID
   */
  async deleteJob(jobId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(`DELETE FROM transcription_jobs WHERE id = ?`, [jobId]);
      console.log(`[TranscriptionJobService] Deleted job: ${jobId}`);
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to delete job:', error);
      throw error;
    }
  }

  /**
   * Delete all completed jobs (cleanup)
   */
  async cleanupCompletedJobs(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.runAsync(
        `DELETE FROM transcription_jobs WHERE status = 'completed'`
      );

      console.log(`[TranscriptionJobService] Cleaned up ${result.changes} completed jobs`);
      return result.changes;
    } catch (error) {
      console.error('[TranscriptionJobService] Failed to cleanup completed jobs:', error);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('[TranscriptionJobService] Database connection closed');
    }
  }
}

// Create singleton instance
export const transcriptionJobService = new TranscriptionJobService();

