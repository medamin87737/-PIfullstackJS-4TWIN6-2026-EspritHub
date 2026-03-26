import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator'

export class SimulateRecommendationDto {
  @IsMongoId()
  activityId: string

  @IsString()
  @MaxLength(4000)
  hrPrompt: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mode?: string
}
