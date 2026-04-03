import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(@Body() dto: ChatMessageDto): Promise<ChatResponseDto> {
    return await this.chatService.processMessage(dto);
  }
}
