import { AiSettingsService } from './ai-settings.service';
import { AiContextService } from './ai-context.service';
import { ChatMessageDto } from './dto/ask.dto';
export declare class AiChatService {
    private readonly settings;
    private readonly context;
    private readonly logger;
    constructor(settings: AiSettingsService, context: AiContextService);
    streamReply(rawMessages: ChatMessageDto[]): AsyncGenerator<string>;
    private streamOpenAi;
    private streamGemini;
}
