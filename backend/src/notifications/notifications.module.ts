import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Notification, NotificationSchema } from './schemas/notification.schema'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { NotificationGateway } from './notification.gateway'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  providers: [NotificationsService, NotificationGateway],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}

