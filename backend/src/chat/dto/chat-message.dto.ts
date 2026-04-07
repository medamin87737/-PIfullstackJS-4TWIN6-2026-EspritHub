import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  activityId!: string;
}
