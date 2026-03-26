import { IsIn, IsOptional, IsString } from 'class-validator'

export class ReviewActivityRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED'

  @IsOptional()
  @IsString()
  hr_note?: string
}

