import { IsIn } from 'class-validator'

export class ManagerDecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED'
}

