import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard'
import { RolesGuard } from '../auth/auth/roles/roles.guard'
import { Roles } from '../auth/auth/roles.decorator'

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recommendations')
  @Roles('HR', 'ADMIN')
  async getRecommendationAudit(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit ?? 200)
    return this.auditService.getByDomain('recommendations', Number.isFinite(parsedLimit) ? parsedLimit : 200)
  }
}
