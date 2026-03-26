import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator'

export class ManualAddRecommendationDto {
  @IsMongoId()
  activityId: string

  @IsMongoId()
  employeeId: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}
