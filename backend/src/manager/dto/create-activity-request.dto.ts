import { Type } from 'class-transformer'
import { IsArray, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'

class RequestSkillDto {
  @IsString()
  skill_name: string

  @IsString()
  desired_level: string
}

export class CreateActivityRequestDto {
  @IsString()
  title: string

  @IsString()
  description: string

  @IsOptional()
  @IsString()
  objectifs?: string

  @IsString()
  type: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestSkillDto)
  requiredSkills: RequestSkillDto[]

  @IsNumber()
  maxParticipants: number

  @IsDate()
  @Type(() => Date)
  startDate: Date

  @IsDate()
  @Type(() => Date)
  endDate: Date

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsString()
  duration?: string
}

