import { IsMongoId, IsNotEmpty, IsString } from 'class-validator'

export class GenerateRecommendationDto {
  @IsString()
  @IsNotEmpty()
  hrPrompt: string

  @IsMongoId()
  activityId: string
}

