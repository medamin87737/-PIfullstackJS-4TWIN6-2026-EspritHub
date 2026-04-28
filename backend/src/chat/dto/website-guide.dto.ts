import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class WebsiteGuideDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  currentPath?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'])
  userRole?: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  language?: string;
}

