import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  manager_id?: string
}

