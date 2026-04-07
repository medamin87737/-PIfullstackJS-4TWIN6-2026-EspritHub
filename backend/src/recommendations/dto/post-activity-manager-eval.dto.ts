import { Type } from 'class-transformer'
import { IsArray, IsInt, IsMongoId, IsString, Max, Min, ValidateNested } from 'class-validator'

class ManagerSkillDto {
  @IsString()
  intitule!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  hierarchie_eval!: number
}

export class PostActivityManagerEvalDto {
  @IsMongoId()
  recommendationId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManagerSkillDto)
  skills!: ManagerSkillDto[]
}

