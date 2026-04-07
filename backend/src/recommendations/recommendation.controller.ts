import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard'
import { RolesGuard } from '../auth/auth/roles/roles.guard'
import { Roles } from '../auth/auth/roles.decorator'
import { RecommendationService } from './recommendation.service'
import { CertificateService } from './certificate.service'
import { NotificationsService } from '../notifications/notifications.service'
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto'
import { HrValidateDto } from './dto/hr-validate.dto'
import { ManagerValidateDto } from './dto/manager-validate.dto'
import { EmployeeResponseDto } from './dto/employee-response.dto'
import { ManualAddRecommendationDto } from './dto/manual-add-recommendation.dto'
import { SimulateRecommendationDto } from './dto/simulate-recommendation.dto'
import { SearchRecommendationsDto } from './dto/search-recommendations.dto'
import { HrAdjustScoreDto } from './dto/hr-adjust-score.dto'
import { HrKeepScoreDto } from './dto/hr-keep-score.dto'

@ApiTags('Recommendations')
@Controller('api/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly notificationsService: NotificationsService,
    private readonly certificateService: CertificateService,
  ) {}

  private reqUserId(req: any): string {
    return req.user?.sub ?? req.user?.userId
  }

  @Post('generate')
  @Roles('HR')
  async generate(@Body() dto: GenerateRecommendationDto, @Req() req: any) {
    return this.recommendationService.generateRecommendations(dto.hrPrompt, dto.activityId, this.reqUserId(req))
  }

  @Post('simulate')
  @Roles('HR')
  async simulate(@Body() dto: SimulateRecommendationDto, @Req() req: any) {
    return this.recommendationService.simulateRecommendations(dto.hrPrompt, dto.activityId, this.reqUserId(req), dto.mode)
  }

  @Get('activity/:activityId')
  @Roles('HR', 'MANAGER')
  async getByActivity(@Param('activityId') activityId: string) {
    return this.recommendationService.getRecommendationsByActivity(activityId)
  }

  @Get('manager/pending')
  @Roles('MANAGER')
  async managerPending(@Req() req: any) {
    return this.recommendationService.getManagerPendingRecommendations(this.reqUserId(req))
  }

  @Post('hr-validate')
  @Roles('HR')
  async hrValidate(@Body() dto: HrValidateDto, @Req() req: any) {
    return this.recommendationService.hrValidateRecommendations(dto.activityId, dto.decisions, this.reqUserId(req))
  }

  @Post('manager-validate')
  @Roles('MANAGER')
  async managerValidate(@Body() dto: ManagerValidateDto, @Req() req: any) {
    return this.recommendationService.managerValidateRecommendations(dto.activityId, dto.decisions, this.reqUserId(req))
  }

  @Post('respond')
  @Roles('EMPLOYEE')
  async respond(@Body() dto: EmployeeResponseDto, @Req() req: any) {
    return this.recommendationService.employeeRespond(
      dto.recommendationId,
      this.reqUserId(req),
      dto.response,
      dto.justification,
    )
  }

  @Get('my')
  @Roles('EMPLOYEE')
  async myRecommendations(@Req() req: any) {
    return this.recommendationService.getMyRecommendations(this.reqUserId(req))
  }

  @Get('my-skill-updates')
  @Roles('EMPLOYEE')
  async mySkillUpdates(@Req() req: any) {
    return this.recommendationService.getMySkillUpdates(this.reqUserId(req))
  }

  @Post('manual-add')
  @Roles('HR', 'MANAGER')
  async manualAdd(@Body() dto: ManualAddRecommendationDto, @Req() req: any) {
    return this.recommendationService.manualAddRecommendation(dto.activityId, dto.employeeId, this.reqUserId(req), dto.note)
  }

  @Post('send-sms-reminder')
  @Roles('HR', 'ADMIN')
  async sendSmsReminder(@Body('recommendationId') recommendationId: string, @Req() req: any) {
    return this.recommendationService.sendSmsReminder(recommendationId, this.reqUserId(req))
  }

  @Delete(':recommendationId')
  @Roles('HR', 'MANAGER')
  async deleteRecommendation(@Param('recommendationId') recommendationId: string, @Req() req: any) {
    return this.recommendationService.removeRecommendation(recommendationId, this.reqUserId(req))
  }

  @Post('search')
  @Roles('HR', 'MANAGER')
  async search(@Body() dto: SearchRecommendationsDto, @Req() req: any) {
    return this.recommendationService.searchRecommendations(dto, this.reqUserId(req))
  }

  @Post('retrain-ai')
  @Roles('HR', 'ADMIN')
  async retrainAi(@Req() req: any) {
    return this.recommendationService.retrainAi(this.reqUserId(req))
  }

  @Post('hr-adjust-score')
  @Roles('HR')
  async hrAdjustScore(@Body() dto: HrAdjustScoreDto, @Req() req: any) {
    return this.recommendationService.hrAdjustScore(dto.recommendationId, this.reqUserId(req), dto.amount, dto.note)
  }

  @Post('hr-keep-score')
  @Roles('HR')
  async hrKeepScore(@Body() dto: HrKeepScoreDto, @Req() req: any) {
    return this.recommendationService.hrKeepScore(dto.recommendationId, this.reqUserId(req), dto.note)
  }

  // ── Certificats — routes spécifiques AVANT les routes :param génériques ──

  @Get('certificates/portfolio')
  @Roles('EMPLOYEE')
  async downloadPortfolio(@Req() req: any, @Res() res: Response) {
    const { buffer, filename } = await this.certificateService.buildPortfolio(this.reqUserId(req))
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Get('certificates/my')
  @Roles('EMPLOYEE')
  async myCertificates(@Req() req: any) {
    return this.certificateService.getMyCertificates(this.reqUserId(req))
  }

  @Get('certificates/:certificateId/download')
  @Roles('EMPLOYEE', 'HR', 'MANAGER', 'ADMIN')
  async downloadCertificate(@Param('certificateId') certificateId: string, @Req() req: any) {
    return this.certificateService.downloadCertificate(certificateId, this.reqUserId(req))
  }

  @Patch(':activityId/mark-completed')
  @Roles('HR')
  async markActivityCompleted(@Param('activityId') activityId: string) {
    return this.certificateService.markActivityCompleted(activityId)
  }

  @Patch(':activityId/recommendations/:recommendationId/presence')
  @Roles('HR')
  async setPresence(
    @Param('recommendationId') recommendationId: string,
    @Body('presence') presence: boolean,
  ) {
    return this.certificateService.setPresence(recommendationId, presence)
  }

  @Post(':activityId/generate-certificates')
  @Roles('HR')
  async generateCertificates(@Param('activityId') activityId: string, @Req() req: any) {
    return this.certificateService.generateForActivity(activityId, this.reqUserId(req))
  }

  @Get(':activityId/export')
  @Roles('HR', 'MANAGER')
  async exportRecommendations(
    @Param('activityId') activityId: string,
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    // Accepte ?format=pdf | ?format=xlsx | ?format=excel
    const fmt: 'pdf' | 'excel' = format === 'xlsx' || format === 'excel' ? 'excel' : 'pdf'
    const { buffer, filename, mimeType } = await this.recommendationService.exportRecommendations(activityId, fmt)

    // 🔔 Notifie via Socket.IO que l'export est prêt
    const userId: string = req.user?.sub ?? req.user?.userId ?? ''
    if (userId) {
      this.notificationsService.notifyExportReady(userId, activityId, fmt)
    }

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}

