import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { AiSettingsService, ResolvedAiConfig } from './ai-settings.service';
import { AiContextService } from './ai-context.service';
import { RMC_SYSTEM_PROMPT } from './rmc-knowledge';
import { ChatMessageDto } from './dto/ask.dto';

const MAX_HISTORY = 12;
const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE = 0.6;

const NOT_CONFIGURED =
  "The assistant isn't available right now. Please reach RMC at rwandamuslimc@gmail.com or +250 788 308 436, or use the Contact page.";
const ERROR_MESSAGE =
  "\n\nSorry — I'm having trouble responding right now. Please try again, or reach us at rwandamuslimc@gmail.com or +250 788 308 436.";

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly settings: AiSettingsService,
    private readonly context: AiContextService,
  ) {}

  /**
   * Streams the assistant's reply token-by-token. Always completes (yields a
   * friendly fallback instead of throwing) so the HTTP stream closes cleanly.
   */
  async *streamReply(rawMessages: ChatMessageDto[]): AsyncGenerator<string> {
    const config = await this.settings.getActiveConfig();
    if (!config) {
      yield NOT_CONFIGURED;
      return;
    }

    const messages = rawMessages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-MAX_HISTORY);

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      yield 'Please type a question and I will be happy to help.';
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let system = `${RMC_SYSTEM_PROMPT}\n\nToday's date is ${today}.`;

    // Append live database context (mosque/imam directory) only when relevant,
    // so normal questions stay cheap.
    const lastUser = messages[messages.length - 1].content;
    if (this.context.isMosqueQuery(lastUser)) {
      const directory = await this.context.getMosqueDirectory();
      if (directory) system += `\n\n${directory}`;
    }

    try {
      if (config.provider === 'openai') {
        yield* this.streamOpenAi(config, system, messages);
      } else {
        yield* this.streamGemini(config, system, messages);
      }
    } catch (err) {
      this.logger.error(`AI streaming error (${config.provider}): ${err}`);
      yield ERROR_MESSAGE;
    }
  }

  private async *streamOpenAi(
    config: ResolvedAiConfig,
    system: string,
    messages: ChatMessageDto[],
  ): AsyncGenerator<string> {
    const client = new OpenAI({ apiKey: config.apiKey });
    const stream = await client.chat.completions.create({
      model: config.model,
      stream: true,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  private async *streamGemini(
    config: ResolvedAiConfig,
    system: string,
    messages: ChatMessageDto[],
  ): AsyncGenerator<string> {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await ai.models.generateContentStream({
      model: config.model,
      contents,
      config: {
        systemInstruction: system,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        // Disable "thinking" on 2.5 models for snappy, low-latency FAQ answers.
        ...(config.model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) yield text;
    }
  }
}
