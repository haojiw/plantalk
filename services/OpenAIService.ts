import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

interface WhisperResponse {
  text: string;
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

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/audio/transcriptions';

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.WHISPER_API_KEY || process.env.WHISPER_API_KEY;
    if (!this.apiKey) {
      console.error('OpenAI API key not found. Please check your environment variables.');
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      console.log(`[OpenAIService] Starting transcription for URI: ${audioUri}`);
      
      // First, get file info to understand what we're working with
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log(`[OpenAIService] File info:`, {
        exists: fileInfo.exists,
        size: fileInfo.exists ? (fileInfo as any).size : 0,
        uri: audioUri
      });

      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      // Check file size if available
      const fileSize = (fileInfo as any).size;
      if (fileSize !== undefined && fileSize === 0) {
        throw new Error('Audio file is empty');
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Try different format configurations based on the file
      let fileConfig;
      
      // Check file extension to determine the proper MIME type
      if (audioUri.includes('.m4a')) {
        fileConfig = { name: 'recording.m4a', type: 'audio/m4a' };
      } else if (audioUri.includes('.mp4')) {
        fileConfig = { name: 'recording.mp4', type: 'audio/mp4' };
      } else if (audioUri.includes('.wav')) {
        fileConfig = { name: 'recording.wav', type: 'audio/wav' };
      } else if (audioUri.includes('.mp3')) {
        fileConfig = { name: 'recording.mp3', type: 'audio/mp3' };
      } else {
        // Default to m4a if we can't determine the format
        console.log(`[OpenAIService] Unknown file format, defaulting to m4a`);
        fileConfig = { name: 'recording.m4a', type: 'audio/m4a' };
      }

      console.log(`[OpenAIService] Using file config:`, fileConfig);

      // Add the audio file with proper configuration
      formData.append('file', {
        uri: audioUri,
        ...fileConfig,
      } as any);

      // Add required parameters
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      // Note: Removed language parameter to let Whisper auto-detect

      console.log(`[OpenAIService] Sending request to Whisper API...`);

      const data = await fetchWithTimeout(
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            // Don't set Content-Type header - let the browser set it with boundary
          },
          body: formData,
        },
        60000 // 60 second timeout for longer recordings
      );

      console.log(`[OpenAIService] Whisper API response received`);

      if (data.text) {
        console.log(`[OpenAIService] Transcription successful, length: ${data.text.length}`);
        return data.text.trim();
      }
      
      throw new Error('Transcription failed: No text in Whisper response');
    } catch (error) {
      console.error('Error transcribing audio with OpenAI:', error);
      
      // Enhanced error logging
      if (error instanceof Error && error.message && error.message.includes('400')) {
        console.error('[OpenAIService] Audio format issue detected. This could be:');
        console.error('1. Unsupported audio format');
        console.error('2. Corrupted audio file');
        console.error('3. File too short (< 0.1s)');
        console.error('4. File too long (> 25MB)');
        console.error('5. Invalid audio encoding');
      }
      
      throw error;
    }
  }
}

// Create singleton instance
export const openAIService = new OpenAIService(); 