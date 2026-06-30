import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiApiKey: string | undefined;
  private readonly openaiApiKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  /**
   * Translates a string of text into multiple target languages using the selected provider.
   * Returns a map of languageCode -> translatedValue.
   */
  async translateText(
    text: string,
    targetLanguages: string[],
    provider: 'gemini' | 'openai'
  ): Promise<Record<string, string>> {
    if (targetLanguages.length === 0) {
      return {};
    }

    this.logger.log(`Translating "${text}" to [${targetLanguages.join(', ')}] using ${provider}`);

    try {
      if (provider === 'openai') {
        return await this.translateWithOpenAi(text, targetLanguages);
      } else {
        return await this.translateWithGemini(text, targetLanguages);
      }
    } catch (error: any) {
      this.logger.error(`AI Translation failed using ${provider}: ${error.message}`);
      return {};
    }
  }

  private async translateWithGemini(text: string, targetLanguages: string[]): Promise<Record<string, string>> {
    const apiKey = this.geminiApiKey || this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured.');
      return {};
    }

    const prompt = `
You are an expert translator. Translate the following English text into these languages: ${targetLanguages.join(', ')}.
Provide the output as a JSON object where the keys are the language codes (exactly as requested) and the values are the translated text. Do not include any markdown styling, backticks, or wrapping.

Text: "${text}"
    `.trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text }]
        }],
        systemInstruction: {
          parts: [{ text: prompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(jsonText.trim());
  }

  private async translateWithOpenAi(text: string, targetLanguages: string[]): Promise<Record<string, string>> {
    const apiKey = this.openaiApiKey || this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not configured.');
      return {};
    }

    const prompt = `
Translate the following English text into these languages: ${targetLanguages.join(', ')}.
Provide the output as a JSON object where the keys are the language codes and the values are the translated text.

Text to translate: "${text}"
    `.trim();

    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert translator. You must output a raw JSON object matching the requested schema. Do not add markdown blocks or extra text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const jsonText = data.choices?.[0]?.message?.content;
    if (!jsonText) {
      throw new Error('Empty response from OpenAI API');
    }

    return JSON.parse(jsonText.trim());
  }
}
