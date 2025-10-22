import Constants from 'expo-constants';

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
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

interface RefinedTranscription {
  title?: string;
  formattedText: string;
}

// Fetch wrapper with timeout
async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit = {},
  timeout = 30000 // 30 seconds default
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

class TextService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    // Updated to use Gemini 2.5 Flash for better text processing performance
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    
    if (!this.apiKey) {
      console.error('Gemini API key not found. Please check your environment variables.');
    }
  }

  async refineTranscription(rawText: string, isFirstChunk: boolean = true): Promise<RefinedTranscription> { //set true by default for first chunk
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (!rawText.trim()) {
      throw new Error('No text provided for refinement');
    }

    console.log(`[TextService] Starting text refinement (first chunk: ${isFirstChunk}), length: ${rawText.length}`);

    let prompt: string = '';

    if (isFirstChunk) {
      prompt = `You are an expert text processing specialist...
        CORE OBJECTIVES:
        1. Generate a compelling 2-5 word title...
        2. Clean transcription errors...
        3. Maintain authentic voice...
        4. Structure content...
        5. Add subheadings if needed...
        QUALITY STANDARDS:
        - Apply MINIMAL changes...
        - Maintain original language...
        - Keep personal expressions...
        - Ensure readability...
        - Fix obvious errors...

        Original transcription:
        "${rawText}"

        Return your response in this exact JSON format:
        {
          "title": "Meaningful title in original language",
          "formattedText": "Enhanced text with proper structure and minimal corrections"
        }`;
    } else {
      // Prompt for subsequent chunks (no title, no JSON)
      prompt = `You are an expert text processor refining part of a longer voice transcription.
        CORE OBJECTIVES:
        1. Clean transcription errors: misheard words, punctuation gaps, excessive filler words ("um", "uh", "like").
        2. Maintain the speaker's authentic voice, personality, and emotional tone.
        3. Structure the content with natural paragraph breaks.
        4. Add subheadings if appropriate to enhance readability.
        QUALITY STANDARDS:
        - Apply MINIMAL changes to preserve original meaning and style.
        - Maintain original language.
        - Keep personal expressions intact.
        - Ensure readability while respecting natural speech patterns.
        - Fix obvious transcription errors without over-editing.

        Original transcription chunk:
        "${rawText}"
        
        Return your response in this exact JSON format:
        {
          "formattedText": "Enhanced text with proper structure and minimal corrections"
        }`;
    }

    try {
      const requestBody: GeminiRequest = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Optimized for Gemini 2.5's improved consistency
          topK: 32, // Fine-tuned for better text processing
          topP: 0.9, // Balanced creativity and accuracy for text cleanup
          maxOutputTokens: 8192, // Sufficient for longer text processing
        }
      };

      console.log(`[TextService] Sending request to Gemini API...`);

      let timeoutMs = 30000 + Math.floor(rawText.length / 250) * 1000; // 30 seconds + 1 second per 250 chars
      timeoutMs = Math.min(timeoutMs, 180000); // Cap at 3 minutes
      console.log(`[TextService] Using refine timeout: ${timeoutMs}ms for text length: ${rawText.length}`);

      const data = await fetchWithTimeout(
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        timeoutMs // dynamic timeout
      );

      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      
      //BEGIN 3 SAFETY CHECKS
      if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') { //check this, do not want app to tweak out if explicit content, alr check in SpeechService but to double check
        console.log('[TextService] Content flagged by safety filter. Returning a placeholder message.');

        return {
          formattedText: 'This content could not be processed due to safety guidelines.'
        };
      }
      //FIRST 2 SAFETY CHECKS DONE

      const responseText = candidate?.content?.parts?.[0]?.text; 

      if (!responseText) { //now handle other errors like if we hit MAX_TOKENS
        const finishReason = candidate?.finishReason; //log the reason if available
        console.error(`[TextService] Refinement failed. No text found in response. Finish Reason: ${finishReason || 'Unknown'}`);
        console.error('[TextService] Full candidate:', JSON.stringify(candidate, null, 2)); //see full candidate for debugging
        throw new Error(`Refinement failed: No text in Gemini response. (Reason: ${finishReason || 'Unknown'})`); //stop current task
      }

      console.log(`[TextService] Response text length: ${responseText.length}`);
      
      // Parse the JSON response
      if (isFirstChunk) {
        try {
          // Handle responses wrapped in markdown code blocks
          let cleanedResponse = responseText.trim();
          
          // Remove markdown code block formatting if present
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          console.log(`[TextService] Cleaned response for parsing:`, cleanedResponse);
          
          if (!cleanedResponse.startsWith('{')) {
            console.warn('[TextService] Response (first chunk) not JSON. Treating as safety block.');
            return {
              title: 'Content Moderated',
              formattedText: 'This content could not be processed due to safety guidelines.'
            };
          }

          const parsed = JSON.parse(cleanedResponse);
          
          if (!parsed.title || !parsed.formattedText) {
            throw new Error('Invalid response format from Gemini (first chunk)');
          }

          console.log(`[TextService] First chunk refinement successful, title: "${parsed.title}"`);
          return {
            title: parsed.title.trim(),
            formattedText: parsed.formattedText.trim()
          };

        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          console.error('Raw response:', responseText);
          
          // Fallback: try to extract title and text manually using more robust regex
          // First try to extract from markdown-wrapped JSON
          let textToMatch = responseText;
          if (responseText.includes('```json')) {
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              textToMatch = jsonMatch[1];
            }
          }
        
          const titleMatch = textToMatch.match(/"title":\s*"([^"]+)"/);
          const textMatch = textToMatch.match(/"formattedText":\s*"((?:[^"\\]|\\.)*)"/);
          
          if (titleMatch && textMatch) {
            console.log(`[TextService] Fallback parsing successful`);
            return {
              title: titleMatch[1].trim(),
              formattedText: textMatch[1].replace(/\\"/g, '"').trim()
            };
          }
          
          // Last resort fallback
          console.warn(`[TextService] Using fallback refinement`);
          return {
            title: `Journal Entry - ${new Date().toLocaleDateString()}`,
            formattedText: rawText // Return original text if parsing fails
          };
        }
      } else { //treat subsequent chunks as plain text
        try {
          let cleanedResponse = responseText.trim();

          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedResponse.startsWith('```')){
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          console.log(`[TextService] Cleaned response for parsing (subsequent chunk):`, cleanedResponse);

          if (!cleanedResponse.startsWith('{')) {
            console.warn('[TextService] Response (subsequent chunk) not JSON. Treating as safety block.');
            return {
              formattedText: 'This content could not be processed due to safety guidelines.' 
            };
          }

          const parsed = JSON.parse(cleanedResponse);

          // Check specifically for formattedText, title is not expected
          if (!parsed.formattedText) {
            throw new Error('Invalid response format from Gemini (subsequent chunk)');
          }

          console.log(`[TextService] Subsequent chunk refinement successful.`);
          return {
            formattedText: parsed.formattedText.trim()
          };

        } catch (parseError) {
          console.error('Error parsing Gemini response (subsequent chunk):', parseError);
          console.error('Raw response (subsequent chunk):', responseText);
          
          // Fallback for subsequent chunks: Use the raw text for this chunk
          console.warn(`[TextService] Using fallback refinement (subsequent chunk)`);
          return {
            formattedText: rawText // Return original chunk text if parsing fails
          };
        }
      }

    } catch (error) {
      console.error('Error refining transcription with Gemini:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const textService = new TextService();
