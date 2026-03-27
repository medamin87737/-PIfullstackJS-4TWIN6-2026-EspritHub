import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator'

export class HrKeepScoreDto {
  @IsMongoId()
  recommendationId: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

