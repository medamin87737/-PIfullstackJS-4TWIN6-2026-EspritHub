import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateQuestionCompetenceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  intitule: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'

  @IsOptional()
  @IsString()
  @IsIn(['knowledge', 'know_how', 'soft_skills'])
  type?: 'knowledge' | 'know_how' | 'soft_skills'
}

