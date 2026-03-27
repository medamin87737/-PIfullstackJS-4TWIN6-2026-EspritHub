import { IsMongoId, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class HrAdjustScoreDto {
  @IsMongoId()
  recommendationId: string

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(0.5)
  amount?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

