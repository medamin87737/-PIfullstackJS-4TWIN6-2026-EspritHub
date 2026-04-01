import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, IsDate, ValidateNested, IsObject, IsOptional } from 'class-validator';

export class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  address: string;
}

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

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}
