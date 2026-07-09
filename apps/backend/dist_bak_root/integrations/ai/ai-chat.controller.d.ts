import { Response } from 'express';
import { AiChatService } from './ai-chat.service';
import { AskDto } from './dto/ask.dto';
export declare class AiChatController {
    private readonly chat;
    constructor(chat: AiChatService);
    ask(dto: AskDto, res: Response): Promise<void>;
}
