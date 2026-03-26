import { IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class SearchRecommendationsDto {
  @IsOptional()
  @IsMongoId()
  activityId?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  query?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number
}
