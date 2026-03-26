import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard'

@ApiTags('Notifications')
@Controller(['api/notifications', 'notifications'])
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private getUserId(req: any): string {
    return req.user?.sub ?? req.user?.userId
  }

  @Get()
  async myNotifications(@Req() req: any) {
    return this.notificationsService.getForUser(this.getUserId(req))
  }

  @Get('me')
  async myNotificationsLegacy(@Req() req: any) {
    return this.notificationsService.getForUser(this.getUserId(req))
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return { unread: await this.notificationsService.getUnreadCount(this.getUserId(req)) }
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id)
    return { ok: true }
  }

  @Patch('read-all')
  async readAll(@Req() req: any) {
    await this.notificationsService.markAllAsRead(this.getUserId(req))
    return { ok: true }
  }
}

