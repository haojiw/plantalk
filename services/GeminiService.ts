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

interface refinedTranscription {
  title: string;
  formattedText: string;
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

class GeminiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`;
    
    if (!this.apiKey) {
      console.error('Gemini API key not found. Please check your environment variables.');
    }
  }

  async refineTranscription(rawText: string): Promise<refinedTranscription> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    if (!rawText.trim()) {
      throw new Error('No text provided for refinement');
    }

    console.log(`[GeminiService] Starting text refinement, length: ${rawText.length}`);

    const prompt = `You are an advanced machine specialized in processing voice transcriptions.

TASK:
1. Create a meaningful 2-5 word title capturing the main theme
2. Fix transcription errors (misheard words, missing punctuation, excessive filler words)
3. Always preserve the speaker's authentic voice and tone
4. For long texts, format the text into proper paragraphs with good flow, optionallyadd subheading when appropriate

CRITICAL CONSTRAINTS: apply MINIMAL changes to the original text
- Use original language from the text, strictly no translation
- Keep all personal expressions and unique phrasing  

Original transcription:
"${rawText}"

Respond in this exact JSON format:
{
  "title": "Generated Title in original language",
  "formattedText": "Processed text with proper paragraphs and fixes"
}`;

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
          temperature: 0.3, // Lower temperature for more consistent formatting
          topK: 40,
          topP: 0.95,
        }
      };

      console.log(`[GeminiService] Sending request to Gemini API...`);

      const data = await fetchWithTimeout(
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        30000 // 30 second timeout
      );

      console.log(`[GeminiService] Gemini API response received`);

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log(`[GeminiService] Response text length: ${responseText.length}`);
      
      // Parse the JSON response
      try {
        // Handle responses wrapped in markdown code blocks
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code block formatting if present
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log(`[GeminiService] Cleaned response for parsing:`, cleanedResponse);
        
        const parsed = JSON.parse(cleanedResponse);
        
        if (!parsed.title || !parsed.formattedText) {
          throw new Error('Invalid response format from Gemini');
        }

        console.log(`[GeminiService] Refinement successful, title: "${parsed.title}"`);
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
          console.log(`[GeminiService] Fallback parsing successful`);
          return {
            title: titleMatch[1].trim(),
            formattedText: textMatch[1].replace(/\\"/g, '"').trim()
          };
        }
        
        // Last resort fallback
        console.warn(`[GeminiService] Using fallback refinement`);
        return {
          title: `Journal Entry - ${new Date().toLocaleDateString()}`,
          formattedText: rawText // Return original text if parsing fails
        };
      }
    } catch (error) {
      console.error('Error refining transcription with Gemini:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const geminiService = new GeminiService(); 