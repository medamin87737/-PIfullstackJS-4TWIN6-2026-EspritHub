import { Type } from 'class-transformer'
import { IsArray, IsInt, IsMongoId, IsString, Max, Min, ValidateNested } from 'class-validator'

class SelfSkillDto {
  @IsString()
  intitule!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  auto_eval!: number
}

export class PostActivitySelfEvalDto {
  @IsMongoId()
  recommendationId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelfSkillDto)
  skills!: SelfSkillDto[]
}

