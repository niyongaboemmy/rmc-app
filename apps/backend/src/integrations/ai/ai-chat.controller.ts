import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AiChatService } from './ai-chat.service';
import { AskDto } from './dto/ask.dto';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiChatController {
  constructor(private readonly chat: AiChatService) {}

  /**
   * Public, streaming chat endpoint used by the website "Ask AI" widget.
   * The provider API key stays server-side; it is never sent to the browser.
   * Uses @Res() (library-specific mode) so the global response transform/serialization
   * is bypassed and we can stream raw text token-by-token.
   */
  @Post('ask')
  @Public()
  @ApiOperation({ summary: 'Ask the RMC assistant (streams plain-text reply)' })
  async ask(@Body() dto: AskDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    try {
      for await (const chunk of this.chat.streamReply(dto.messages)) {
        res.write(chunk);
      }
    } catch {
      if (!res.writableEnded) {
        res.write(
          "\n\nSorry — I'm having trouble responding right now. Please try again, or reach us at rwandamuslimc@gmail.com or +250 788 308 436.",
        );
      }
    } finally {
      res.end();
    }
  }
}
