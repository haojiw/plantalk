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
   * Upload audio file to AssemblyAI
   */
  private async uploadAudio(audioBase64: string): Promise<string> {
    console.log('[SpeechService] Uploading audio to AssemblyAI...');
    
    // Convert base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/octet-stream',
      },
      body: bytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload audio: ${response.status} - ${errorText}`);
    }

    const data: AssemblyAIUploadResponse = await response.json();
    console.log('[SpeechService] Audio uploaded successfully');
    return data.upload_url;
  }

  /**
   * Create transcription job
   */
  private async createTranscription(audioUrl: string): Promise<string> {
    console.log('[SpeechService] Creating transcription job...');
    
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create transcription: ${response.status} - ${errorText}`);
    }

    const data: AssemblyAITranscript = await response.json();
    console.log('[SpeechService] Transcription job created:', data.id);
    return data.id;
  }

  /**
   * Poll transcription status until completed
   */
  private async pollTranscription(transcriptId: string): Promise<AssemblyAITranscript> {
    console.log('[SpeechService] Polling transcription status...');
    
    const pollingEndpoint = `${this.baseUrl}/transcript/${transcriptId}`;
    const maxAttempts = 200; // 10 minutes with 3-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const pollingResponse = await fetch(pollingEndpoint, {
        headers: {
          'authorization': this.apiKey,
        },
      });

      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text();
        throw new Error(`Failed to get transcription status: ${pollingResponse.status} - ${errorText}`);
      }

      const transcriptionResult: AssemblyAITranscript = await pollingResponse.json();
      
      console.log(`[SpeechService] Transcription status: ${transcriptionResult.status}`);

      if (transcriptionResult.status === 'completed') {
        console.log('[SpeechService] Transcription completed successfully');
        return transcriptionResult;
      } else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error || 'Unknown error'}`);
      }

      // Wait 3 seconds before polling again (as per AssemblyAI documentation)
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
    }

    throw new Error('Transcription timeout: took longer than expected');
  }

  async transcribeAudio(audioUri: string, audioDurationSeconds?: number): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    try {
      console.log(`[SpeechService] Starting transcription for URI: ${audioUri}`);
      
      // Convert relative path to absolute path if needed
      const absoluteAudioUri = getAbsoluteAudioPath(audioUri);
      if (!absoluteAudioUri) {
        throw new Error('Invalid audio URI');
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
        throw new Error('Audio file does not exist');
      }

      // Check file size if available
      const fileSize = (fileInfo as any).size;
      if (fileSize !== undefined && fileSize === 0) {
        throw new Error('Audio file is empty');
      }

      // Read the audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(absoluteAudioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 1: Upload audio file to AssemblyAI
      const uploadUrl = await this.uploadAudio(audioBase64);

      // Step 2: Create transcription job
      const transcriptId = await this.createTranscription(uploadUrl);

      // Step 3: Poll until transcription is complete
      const transcript = await this.pollTranscription(transcriptId);

      if (!transcript.text) {
        console.error(`[SpeechService] Transcription completed but no text found`);
        throw new Error('Transcription failed: No text in AssemblyAI response.');
      }

      console.log(`[SpeechService] Transcription successful, length: ${transcript.text.length}`);
      console.log(`[SpeechService] Transcription: ${transcript.text.trim()}`);
      return transcript.text.trim();
      
    } catch (error) {
      console.error('Error transcribing audio with AssemblyAI:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('[SpeechService] Error details:', error.message);
        if (error.message.includes('400') || error.message.includes('format')) {
          console.error('[SpeechService] Audio format issue detected. This could be:');
          console.error('1. Unsupported audio format');
          console.error('2. Corrupted audio file');
          console.error('3. File too short');
          console.error('4. Invalid audio encoding');
        }
      }
      
      throw error;
    }
  }
}

// Create singleton instance of SpeechService
export const speechService = new SpeechService();
