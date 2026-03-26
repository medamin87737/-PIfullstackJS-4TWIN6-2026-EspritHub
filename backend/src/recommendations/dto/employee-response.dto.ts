import { IsIn, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator'

export class EmployeeResponseDto {
  @IsMongoId()
  recommendationId: string

  @IsString()
  @IsIn(['ACCEPTED', 'DECLINED'])
  response: 'ACCEPTED' | 'DECLINED'

  @IsOptional()
  @IsString()
  @ValidateIf((o: EmployeeResponseDto) => o.response === 'DECLINED')
  @IsNotEmpty()
  justification?: string
}

