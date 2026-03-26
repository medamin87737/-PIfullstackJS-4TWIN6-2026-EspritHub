import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, IsDate, ValidateNested } from 'class-validator';

export class RequiredSkillDto {
  @IsString()
  skill_name: string;

  @IsString()
  desired_level: string;
}

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  departmentId: string;

  @IsString()
  type: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredSkillDto)
  requiredSkills: RequiredSkillDto[];

  @IsNumber()
  maxParticipants: number;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;
}
