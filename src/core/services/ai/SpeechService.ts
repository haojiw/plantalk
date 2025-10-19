import { getAbsoluteAudioPath } from '@/shared/utils';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

interface GeminiAudioRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Fetch wrapper with timeout
async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit = {},
  timeout = 30000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(`API ${res.status}: ${JSON.stringify(body)}`);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

class SpeechService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    
    if (!this.apiKey) {
      console.error('Gemini API key not found. Please check your environment variables.');
    }
  }

  async transcribeAudio(audioUri: string, audioDurationSeconds?: number): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      console.log(`[SpeechService] Starting transcription for URI: ${audioUri}`);
      
      // Convert relative path to absolute path if needed
      const absoluteAudioUri = getAbsoluteAudioPath(audioUri);
      if (!absoluteAudioUri) {
        throw new Error('Invalid audio URI');
      }
      
      console.log(`[SpeechService] Using absolute path: ${absoluteAudioUri}`);
      
      // First, get file info to understand what we're working with
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

      // Determine MIME type based on file extension
      let mimeType = 'audio/mp3'; // default
      if (absoluteAudioUri.includes('.m4a')) {
        mimeType = 'audio/aac';
      } else if (absoluteAudioUri.includes('.mp4')) {
        mimeType = 'audio/mp4';
      } else if (absoluteAudioUri.includes('.wav')) {
        mimeType = 'audio/wav';
      } else if (absoluteAudioUri.includes('.mp3')) {
        mimeType = 'audio/mp3';
      } else if (absoluteAudioUri.includes('.ogg')) {
        mimeType = 'audio/ogg';
      } else if (absoluteAudioUri.includes('.flac')) {
        mimeType = 'audio/flac';
      } else if (absoluteAudioUri.includes('.aiff')) {
        mimeType = 'audio/aiff';
      }

      console.log(`[SpeechService] Using MIME type: ${mimeType}`);

      const requestBody: GeminiAudioRequest = {
        contents: [
          {
            parts: [
              {
                text: "Generate a transcript of the speech."
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more accurate transcription
          topK: 40,
          topP: 0.95,
        }
      };

      // Calculate dynamic timeout based on audio duration
      // Gemini represents each second of audio as 32 tokens, so longer audio needs more time
      let timeoutMs = 60000; // Default 60 seconds
      if (audioDurationSeconds) {
        if (audioDurationSeconds < 360) { // Less than 6 minutes
          timeoutMs = 60000; // 60 seconds
        } else {
          // For longer audio, use (duration / 30) seconds timeout (more generous than OpenAI)
          timeoutMs = Math.round((audioDurationSeconds / 30) * 1000);
          timeoutMs = Math.max(timeoutMs, 60000); // Minimum 60 seconds
          timeoutMs = Math.min(timeoutMs, 300000); // Maximum 5 minutes
        }
        console.log(`[SpeechService] Using dynamic timeout: ${timeoutMs}ms for ${audioDurationSeconds}s audio`);
      } else {
        console.log(`[SpeechService] No duration provided, using default timeout: ${timeoutMs}ms`);
      }

      console.log(`[SpeechService] Sending request to Gemini API...`);

      const data = await fetchWithTimeout(
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs
      );

      console.log(`[SpeechService] Gemini API response received`);

      //FIRST SAFETY CHECK
      if (!data.candidates || data.candidates.length === 0) {
        console.warn('[SpeechService] Received a response with no candidates. This is likely a safety block.');
        // Return the placeholder message so the app doesn't crash
        return 'Transcription could not be generated due to safety guidelines.';
      }

      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;

      //SECOND AND THIRD SAFETY CHECKS
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
        console.warn('[SpeechService] Audio content flagged by safety filter. Returning a placeholder message.');
        return 'Transcription could not be generated due to safety guidelines.';
      }

      const transcriptionText = candidate?.content?.parts?.[0]?.text; //handle other reasons like maxtokens 

      if (!transcriptionText) {
        console.error(`[SpeechService] Transcription failed. No text found in response. Finish Reason: ${finishReason || 'Unknown'}`);
        console.error('[SpeechService] Full candidate:', JSON.stringify(candidate, null, 2));
        throw new Error(`Transcription failed: No text in Gemini response. (Reason: ${finishReason || 'Unknown'})`);
      }

      console.log(`[SpeechService] Transcription successful, length: ${transcriptionText.length}`);
      return transcriptionText.trim();
      
    } catch (error) {
      console.error('Error transcribing audio with Gemini:', error);
      
      // Enhanced error logging
      if (error instanceof Error && error.message && error.message.includes('400')) {
        console.error('[SpeechService] Audio format issue detected. This could be:');
        console.error('1. Unsupported audio format');
        console.error('2. Corrupted audio file');
        console.error('3. File too short');
        console.error('4. File too long (> 9.5 hours)');
        console.error('5. Invalid audio encoding');
        console.error('6. File too large (> 20MB for inline data)');
      }
      
      throw error;
    }
  }
}

// Create singleton instance
export const speechService = new SpeechService();
