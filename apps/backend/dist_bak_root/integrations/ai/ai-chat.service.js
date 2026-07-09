"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const genai_1 = require("@google/genai");
const ai_settings_service_1 = require("./ai-settings.service");
const ai_context_service_1 = require("./ai-context.service");
const rmc_knowledge_1 = require("./rmc-knowledge");
const MAX_HISTORY = 12;
const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE = 0.6;
const NOT_CONFIGURED = "The assistant isn't available right now. Please reach RMC at rwandamuslimc@gmail.com or +250 788 308 436, or use the Contact page.";
const ERROR_MESSAGE = "\n\nSorry — I'm having trouble responding right now. Please try again, or reach us at rwandamuslimc@gmail.com or +250 788 308 436.";
let AiChatService = AiChatService_1 = class AiChatService {
    constructor(settings, context) {
        this.settings = settings;
        this.context = context;
        this.logger = new common_1.Logger(AiChatService_1.name);
    }
    async *streamReply(rawMessages) {
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
        let system = `${rmc_knowledge_1.RMC_SYSTEM_PROMPT}\n\nToday's date is ${today}.`;
        const lastUser = messages[messages.length - 1].content;
        if (this.context.isMosqueQuery(lastUser)) {
            const directory = await this.context.getMosqueDirectory();
            if (directory)
                system += `\n\n${directory}`;
        }
        try {
            if (config.provider === 'openai') {
                yield* this.streamOpenAi(config, system, messages);
            }
            else {
                yield* this.streamGemini(config, system, messages);
            }
        }
        catch (err) {
            this.logger.error(`AI streaming error (${config.provider}): ${err}`);
            yield ERROR_MESSAGE;
        }
    }
    async *streamOpenAi(config, system, messages) {
        const client = new openai_1.default({ apiKey: config.apiKey });
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
            if (delta)
                yield delta;
        }
    }
    async *streamGemini(config, system, messages) {
        const ai = new genai_1.GoogleGenAI({ apiKey: config.apiKey });
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
                ...(config.model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
        });
        for await (const chunk of result) {
            const text = chunk.text;
            if (text)
                yield text;
        }
    }
};
exports.AiChatService = AiChatService;
exports.AiChatService = AiChatService = AiChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_settings_service_1.AiSettingsService,
        ai_context_service_1.AiContextService])
], AiChatService);
//# sourceMappingURL=ai-chat.service.js.map