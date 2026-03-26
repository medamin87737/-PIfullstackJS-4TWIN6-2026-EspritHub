import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ActivitySkillDto {
  @IsString()
  @MaxLength(120)
  skill_name!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'expert'])
  desired_level?: 'low' | 'medium' | 'high' | 'expert';

  @IsOptional()
  weight?: number;
}

export class GenerateActivityPromptDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  priority?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  seats?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivitySkillDto)
  required_skills?: ActivitySkillDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;
}
