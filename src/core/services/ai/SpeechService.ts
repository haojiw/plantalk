import { getAbsoluteAudioPath } from '@/shared/utils';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

interface AssemblyAIUploadResponse {
  upload_url: string;
}

interface AssemblyAITranscript {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

/**
 * Custom error class for network-related failures in speech transcription
 */
export class SpeechServiceNetworkError extends Error {
  constructor(message: string, public readonly isRetryable: boolean = true) {
    super(message);
    this.name = 'SpeechServiceNetworkError';
  }
}

/**
 * Custom error class for API-related failures in speech transcription
 */
export class SpeechServiceAPIError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'SpeechServiceAPIError';
  }
}

/**
 * Custom error class for audio file issues (missing, corrupted, empty)
 * These are NOT retryable - requires user to re-record
 */
export class SpeechServiceFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpeechServiceFileError';
  }
}

/**
 * Helper function to add timeout to fetch requests
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SpeechServiceNetworkError(`Request timed out after ${timeoutMs}ms`, true);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * @brief Provides speech-to-text services using the Gemini API.
 *
 * This class handles reading local audio files, encoding them,
 * and sending them to Gemini for transcription.
 */
class SpeechService {
  private apiKey: string;
  private baseUrl: string = 'https://api.assemblyai.com/v2';

  /**
   * @brief Initializes the SpeechService, retrieving the Gemini API key and setting the API endpoint.
   */
  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.ASSEMBLYAI_API_KEY || process.env.ASSEMBLYAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('AssemblyAI API key not found. Please check your environment variables.');
    }
  }

  /**
   * Upload audio file to AssemblyAI using streaming upload to avoid OOM on large files
   * Timeout: 5 minutes for large file uploads
   */
  private async uploadAudio(fileUri: string): Promise<string> {
    console.log('[SpeechService] Uploading audio to AssemblyAI...');

    try {
      const response = await FileSystem.uploadAsync(
        `${this.baseUrl}/upload`,
        fileUri,
        {
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'authorization': this.apiKey,
            'content-type': 'application/octet-stream',
          },
        }
      );

      if (response.status < 200 || response.status >= 300) {
        // Determine if error is retryable based on status code
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new SpeechServiceAPIError(
          `Failed to upload audio: ${response.status} - ${response.body}`,
          response.status
        );
      }

      const data: AssemblyAIUploadResponse = JSON.parse(response.body);
      console.log('[SpeechService] Audio uploaded successfully');
      return data.upload_url;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof SpeechServiceAPIError || error instanceof SpeechServiceNetworkError) {
        throw error;
      }
      // Wrap network errors
      if (error instanceof TypeError && error.message.includes('Network')) {
        throw new SpeechServiceNetworkError('Network connection failed during audio upload', true);
      }
      throw new SpeechServiceNetworkError(`Audio upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }

  /**
   * Create transcription job
   * Timeout: 30 seconds for API request
   */
  private async createTranscription(audioUrl: string): Promise<string> {
    console.log('[SpeechService] Creating transcription job...');
    
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/transcript`,
        {
          method: 'POST',
          headers: {
            'authorization': this.apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            audio_url: audioUrl, 
            language_detection: true, 
          }),
        },
        30000 // 30 second timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new SpeechServiceAPIError(
          `Failed to create transcription: ${response.status} - ${errorText}`,
          response.status
        );
      }

      const data: AssemblyAITranscript = await response.json();
      console.log('[SpeechService] Transcription job created:', data.id);
      return data.id;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof SpeechServiceAPIError || error instanceof SpeechServiceNetworkError) {
        throw error;
      }
      // Wrap network errors
      throw new SpeechServiceNetworkError(
        `Failed to create transcription job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  /**
   * Poll transcription status until completed
   * Uses 15-second timeout per poll request, max 200 attempts (10 minutes total)
   */
  private async pollTranscription(transcriptId: string): Promise<AssemblyAITranscript> {
    console.log('[SpeechService] Polling transcription status...');
    
    const pollingEndpoint = `${this.baseUrl}/transcript/${transcriptId}`;
    const maxAttempts = 200; // 10 minutes with 3-second intervals
    let attempts = 0;
    let consecutiveNetworkErrors = 0;
    const maxConsecutiveNetworkErrors = 5;

    while (attempts < maxAttempts) {
      try {
        const pollingResponse = await fetchWithTimeout(
          pollingEndpoint,
          {
            headers: {
              'authorization': this.apiKey,
            },
          },
          15000 // 15 second timeout per poll
        );

        // Reset network error counter on successful request
        consecutiveNetworkErrors = 0;

        if (!pollingResponse.ok) {
          const errorText = await pollingResponse.text();
          throw new SpeechServiceAPIError(
            `Failed to get transcription status: ${pollingResponse.status} - ${errorText}`,
            pollingResponse.status
          );
        }

        const transcriptionResult: AssemblyAITranscript = await pollingResponse.json();
        
        console.log(`[SpeechService] Transcription status: ${transcriptionResult.status}`);

        if (transcriptionResult.status === 'completed') {
          console.log('[SpeechService] Transcription completed successfully');
          return transcriptionResult;
        } else if (transcriptionResult.status === 'error') {
          throw new SpeechServiceAPIError(
            `Transcription failed: ${transcriptionResult.error || 'Unknown error from AssemblyAI'}`,
            undefined
          );
        }

        // Wait 3 seconds before polling again (as per AssemblyAI documentation)
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        // Handle network errors with retry logic
        if (error instanceof SpeechServiceNetworkError) {
          consecutiveNetworkErrors++;
          console.warn(`[SpeechService] Network error during polling (attempt ${consecutiveNetworkErrors}/${maxConsecutiveNetworkErrors}): ${error.message}`);
          
          if (consecutiveNetworkErrors >= maxConsecutiveNetworkErrors) {
            throw new SpeechServiceNetworkError(
              `Polling failed: ${maxConsecutiveNetworkErrors} consecutive network errors`,
              true
            );
          }
          
          // Wait longer before retrying after network error
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
          continue;
        }
        
        // Re-throw API errors immediately (non-retryable within this poll cycle)
        throw error;
      }
    }

    throw new SpeechServiceNetworkError('Transcription timeout: took longer than 10 minutes', false);
  }

  /**
   * Resume transcription polling for an existing job ID.
   * Used for idempotent crash recovery - if we already uploaded audio and have a job ID,
   * we can resume polling without re-uploading (saves money and time).
   * 
   * @param transcriptId - The AssemblyAI transcript ID to resume
   * @returns The transcription text
   */
  async resumeTranscription(transcriptId: string): Promise<string> {
    if (!this.apiKey) {
      throw new SpeechServiceAPIError('AssemblyAI API key not configured');
    }

    console.log(`[SpeechService] Resuming transcription for ID: ${transcriptId}`);
    
    try {
      const transcript = await this.pollTranscription(transcriptId);
      
      if (!transcript.text) {
        throw new SpeechServiceAPIError('Transcription completed but returned no text');
      }
      
      console.log(`[SpeechService] Resume transcription successful, length: ${transcript.text.length}`);
      return transcript.text.trim();
    } catch (error) {
      console.error('[SpeechService] Error resuming transcription:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio and return both the transcript ID and text.
   * The transcript ID can be saved for idempotent crash recovery.
   * 
   * @param audioUri - Path to the audio file
   * @param audioDurationSeconds - Optional duration for timeout calculation
   * @returns Object containing transcriptId and text
   */
  async transcribeAudioWithId(audioUri: string, audioDurationSeconds?: number): Promise<{ transcriptId: string; text: string }> {
    if (!this.apiKey) {
      throw new SpeechServiceAPIError('AssemblyAI API key not configured');
    }

    try {
      console.log(`[SpeechService] Starting transcription with ID tracking for URI: ${audioUri}`);
      
      // Convert relative path to absolute path if needed
      const absoluteAudioUri = getAbsoluteAudioPath(audioUri);
      if (!absoluteAudioUri) {
        throw new SpeechServiceFileError('Invalid audio URI - could not resolve path');
      }
      
      console.log(`[SpeechService] Using absolute path: ${absoluteAudioUri}`);
      
      // Verify the file exists
      const fileInfo = await FileSystem.getInfoAsync(absoluteAudioUri);
      console.log(`[SpeechService] File info:`, {
        exists: fileInfo.exists,
        size: fileInfo.exists ? (fileInfo as any).size : 0,
        uri: absoluteAudioUri
      });

      if (!fileInfo.exists) {
        throw new SpeechServiceFileError('Audio file does not exist - may have been deleted');
      }

      const fileSize = (fileInfo as any).size;
      if (fileSize !== undefined && fileSize === 0) {
        throw new SpeechServiceFileError('Audio file is empty - recording may have failed');
      }

      // Step 1: Upload audio file to AssemblyAI
      const uploadUrl = await this.uploadAudio(absoluteAudioUri);

      // Step 2: Create transcription job - SAVE THIS ID FOR CRASH RECOVERY
      const transcriptId = await this.createTranscription(uploadUrl);
      console.log(`[SpeechService] Transcription job created with ID: ${transcriptId}`);

      // Step 3: Poll until transcription is complete
      const transcript = await this.pollTranscription(transcriptId);

      if (!transcript.text) {
        throw new SpeechServiceAPIError('Transcription completed but returned no text - audio may be silent or unintelligible');
      }

      console.log(`[SpeechService] Transcription successful, length: ${transcript.text.length}`);
      
      return {
        transcriptId,
        text: transcript.text.trim()
      };
      
    } catch (error) {
      console.error('[SpeechService] Error transcribing audio:', error);
      
      // Re-throw our custom errors as-is
      if (error instanceof SpeechServiceFileError || 
          error instanceof SpeechServiceAPIError || 
          error instanceof SpeechServiceNetworkError) {
        throw error;
      }
      
      if (error instanceof Error) {
        console.error('[SpeechService] Error details:', error.message);
        
        if (error.message.includes('400') || error.message.includes('format')) {
          throw new SpeechServiceFileError(`Audio format error: ${error.message}`);
        }
        
        if (error.message.includes('network') || error.message.includes('Network') || 
            error.message.includes('timeout') || error.message.includes('connection')) {
          throw new SpeechServiceNetworkError(error.message, true);
        }
      }
      
      throw new SpeechServiceAPIError(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy method - transcribes audio and returns just the text.
   * For new code, prefer transcribeAudioWithId for crash recovery support.
   */
  async transcribeAudio(audioUri: string, audioDurationSeconds?: number): Promise<string> {
    const result = await this.transcribeAudioWithId(audioUri, audioDurationSeconds);
    return result.text;
  }
}

// Create singleton instance of SpeechService
export const speechService = new SpeechService();
