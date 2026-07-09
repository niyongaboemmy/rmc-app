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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const ai_chat_service_1 = require("./ai-chat.service");
const ask_dto_1 = require("./dto/ask.dto");
let AiChatController = class AiChatController {
    constructor(chat) {
        this.chat = chat;
    }
    async ask(dto, res) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function')
            res.flushHeaders();
        try {
            for await (const chunk of this.chat.streamReply(dto.messages)) {
                res.write(chunk);
            }
        }
        catch {
            if (!res.writableEnded) {
                res.write("\n\nSorry — I'm having trouble responding right now. Please try again, or reach us at rwandamuslimc@gmail.com or +250 788 308 436.");
            }
        }
        finally {
            res.end();
        }
    }
};
exports.AiChatController = AiChatController;
__decorate([
    (0, common_1.Post)('ask'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Ask the RMC assistant (streams plain-text reply)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ask_dto_1.AskDto, Object]),
    __metadata("design:returntype", Promise)
], AiChatController.prototype, "ask", null);
exports.AiChatController = AiChatController = __decorate([
    (0, swagger_1.ApiTags)('AI Assistant'),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_chat_service_1.AiChatService])
], AiChatController);
//# sourceMappingURL=ai-chat.controller.js.map