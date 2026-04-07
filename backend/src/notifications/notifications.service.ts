import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { NotificationGateway } from './notification.gateway'
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(input: CreateNotificationDto | {
    userId: string | Types.ObjectId
    type: string
    title: string
    message: string
    data?: Record<string, any>
    activityId?: string | Types.ObjectId
    meta?: Record<string, any>
  }) {
    const legacy = input as any
    const data = input.data ?? legacy.meta ?? (legacy.activityId ? { activityId: String(legacy.activityId) } : undefined)
    const doc = new this.notificationModel({
      userId: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      data,
      created_at: new Date(),
    })
    await doc.save()
    try {
      this.notificationGateway.sendToUser(String(input.userId), 'notification_created', doc.toObject())
    } catch (err) {
      this.logger.warn(`notification_created emit failed for user=${String(input.userId)}: ${String(err)}`)
    }
    return doc
  }

  async getForUser(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(200)
      .lean()
      .exec()
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: new Types.ObjectId(notificationId) },
      { $set: { read: true } },
    )
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    )
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId), read: false })
  }

  async deleteForUser(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    })
  }

  async notifyHRRecommendationReady(hrUserId: string, activityId: string, activityTitle: string, count: number) {
    await this.create({
      userId: hrUserId,
      type: NotificationType.RECOMMENDATION_GENERATED,
      title: 'Recommandations prêtes',
      message: `${count} employés recommandés pour "${activityTitle}"`,
      data: { activityId },
    })
    this.notificationGateway.sendToUser(hrUserId, 'recommendation_ready', {
      activityId,
      count,
      message: `${count} employés recommandés pour "${activityTitle}"`,
    })
  }

  async notifyManagerValidationRequired(
    managerUserId: string,
    activityId: string,
    activityTitle: string,
    hrName: string,
    activityDetails?: Record<string, any>,
  ) {
    await this.create({
      userId: managerUserId,
      type: NotificationType.MANAGER_VALIDATION_REQUIRED,
      title: 'Validation requise',
      message: `HR ${hrName} a validé une liste pour "${activityTitle}"`,
      data: { activityId, ...activityDetails },
    })
    this.notificationGateway.sendToUser(managerUserId, 'manager_review_required', {
      activityId,
      activityTitle,
      hrName,
      ...activityDetails,
    })
  }

  async notifyEmployeeInvitation(
    employeeUserId: string,
    activityId: string,
    activityTitle: string,
    activityDate: Date,
    activityDetails?: Record<string, any>,
  ) {
    await this.create({
      userId: employeeUserId,
      type: NotificationType.EMPLOYEE_NOTIFIED,
      title: 'Invitation à une activité',
      message: `Vous êtes sélectionné(e) pour "${activityTitle}"`,
      data: { activityId, ...activityDetails },
    })
    this.notificationGateway.sendToUser(employeeUserId, 'activity_invitation', {
      activityId,
      activityTitle,
      date: activityDate,
      message: `Vous êtes sélectionné(e) pour "${activityTitle}"`,
      ...activityDetails,
    })
  }

  async notifyHRAndManagerEmployeeResponse(
    hrId: string,
    managerId: string,
    employeeId: string,
    employeeName: string,
    activityId: string,
    status: 'ACCEPTED' | 'DECLINED',
    justification?: string,
  ) {
    const type = status === 'ACCEPTED' ? NotificationType.EMPLOYEE_ACCEPTED : NotificationType.EMPLOYEE_DECLINED
    const title = status === 'ACCEPTED' ? 'Employé accepté' : 'Employé a décliné'
    const message =
      status === 'ACCEPTED'
        ? `${employeeName} a accepté de participer`
        : `${employeeName} a décliné : ${justification ?? ''}`

    await this.create({
      userId: hrId,
      type,
      title,
      message,
      data: { activityId, employeeId },
    })
    await this.create({
      userId: managerId,
      type,
      title,
      message,
      data: { activityId, employeeId },
    })

    const payload = { employeeId, employeeName, activityId, status, justification }
    this.notificationGateway.sendToUser(hrId, 'employee_response', payload)
    this.notificationGateway.sendToUser(managerId, 'employee_response', payload)
  }

  notifyExportReady(userId: string, activityId: string, format: 'pdf' | 'excel'): void {
    const label = format === 'pdf' ? 'PDF' : 'Excel'
    this.notificationGateway.sendToUser(userId, 'export_ready', {
      activityId,
      format,
      message: `Export ${label} prêt pour téléchargement`,
    })
    this.logger.log(`export_ready emitted → userId=${userId} activityId=${activityId} format=${format}`)
  }
}

