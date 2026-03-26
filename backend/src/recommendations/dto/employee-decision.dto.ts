import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

export class EmployeeDecisionDto {
  @IsIn(['CONFIRMED', 'DECLINED'])
  status: 'CONFIRMED' | 'DECLINED'

  @ValidateIf((o) => o.status === 'DECLINED')
  @IsString()
  @MaxLength(1000)
  absenceReason?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

