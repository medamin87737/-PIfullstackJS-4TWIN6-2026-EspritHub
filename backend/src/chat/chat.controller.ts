import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RewritePromptDto } from './dto/rewrite-prompt.dto';
import { GenerateActivityPromptDto } from './dto/generate-activity-prompt.dto';
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Protected endpoint (JWT) to avoid exposing the OpenRouter key in the frontend.
   */
  @Post('rewrite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rewrite(@Body() dto: RewritePromptDto) {
    return this.chatService.rewritePrompt(dto);
  }

  @Post('generate-activity-prompt')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateActivityPrompt(@Body() dto: GenerateActivityPromptDto) {
    return this.chatService.generateActivityPrompt(dto);
  }
}

