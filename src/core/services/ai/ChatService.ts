import Constants from 'expo-constants';

class ChatService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    if (!this.apiKey) {
      console.error('[ChatService] Gemini API key not found.');
    }
  }

  async getResponse(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.apiKey) throw new Error('Gemini API key not configured');

    console.log(`[ChatService] Sending request, ${history.length} messages`);

    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 1,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Gemini API ${res.status}: ${body}`);
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts;

      if (!parts || parts.length === 0) {
        throw new Error('Empty response from Gemini');
      }

      // Filter out thinking parts (gemini thinking models mark them with thought: true)
      const text = parts
        .filter((p: any) => !p.thought)
        .map((p: any) => p.text || '')
        .join('');

      if (!text) {
        throw new Error('No visible response text from Gemini');
      }

      console.log(`[ChatService] Response: ${text.length} chars`);
      return text.trim();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out (60s)');
      }
      throw err;
    }
  }

  async generateSummary(text: string): Promise<string> {
    return this.getResponse([{ role: 'user', content: text }]);
  }
}

export const chatService = new ChatService();
