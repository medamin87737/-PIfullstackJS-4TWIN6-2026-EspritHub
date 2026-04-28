import { Controller, Post, Body, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { RewritePromptDto } from './dto/rewrite-prompt.dto';
import { WebsiteGuideDto } from './dto/website-guide.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(
    @Body() dto: ChatMessageDto,
    @Query('lang') userLanguage?: string,
  ): Promise<ChatResponseDto> {
    return await this.chatService.processMessage(dto, userLanguage || 'fr');
  }

  @Post('rewrite')
  async rewrite(@Body() dto: RewritePromptDto): Promise<{ rewritten: string; model: string }> {
    return await this.chatService.rewritePrompt(dto);
  }

  @Post('website-guide')
  async websiteGuide(@Body() dto: WebsiteGuideDto): Promise<{ reply: string; timestamp: Date }> {
    return await this.chatService.websiteGuide(dto);
  }
}
