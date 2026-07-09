export declare class ChatMessageDto {
    role: 'user' | 'assistant';
    content: string;
}
export declare class AskDto {
    messages: ChatMessageDto[];
}
