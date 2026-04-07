import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    HttpModule,
    ActivitiesModule,
    TranslationModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
