import { Type } from 'class-transformer'
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator'

class ValidateDecisionDto {
  @IsMongoId()
  recommendationId: string

  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject'

  @IsOptional()
  @IsString()
  note?: string
}

export class ManagerValidateDto {
  @IsMongoId()
  activityId: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateDecisionDto)
  decisions: ValidateDecisionDto[]
}

