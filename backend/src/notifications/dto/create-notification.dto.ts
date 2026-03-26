import { IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateNotificationDto {
  @IsMongoId()
  userId: string

  @IsString()
  @IsNotEmpty()
  type: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string

  @IsOptional()
  @IsObject()
  data?: Record<string, any>
}

