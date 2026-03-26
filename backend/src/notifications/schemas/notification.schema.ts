import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type NotificationDocument = Notification & Document

export enum NotificationType {
  RECOMMENDATION_GENERATED = 'RECOMMENDATION_GENERATED',
  HR_VALIDATION_REQUIRED = 'HR_VALIDATION_REQUIRED',
  MANAGER_VALIDATION_REQUIRED = 'MANAGER_VALIDATION_REQUIRED',
  EMPLOYEE_NOTIFIED = 'EMPLOYEE_NOTIFIED',
  EMPLOYEE_ACCEPTED = 'EMPLOYEE_ACCEPTED',
  EMPLOYEE_DECLINED = 'EMPLOYEE_DECLINED',
  RECOMMENDATION_REJECTED_HR = 'RECOMMENDATION_REJECTED_HR',
  RECOMMENDATION_REJECTED_MANAGER = 'RECOMMENDATION_REJECTED_MANAGER',
  MANAGER_ACTIVITY_REQUEST_SUBMITTED = 'MANAGER_ACTIVITY_REQUEST_SUBMITTED',
  MANAGER_ACTIVITY_REQUEST_APPROVED = 'MANAGER_ACTIVITY_REQUEST_APPROVED',
  MANAGER_ACTIVITY_REQUEST_REJECTED = 'MANAGER_ACTIVITY_REQUEST_REJECTED',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId

  @Prop({ type: String, enum: Object.values(NotificationType), required: true, index: true })
  type: string

  @Prop({ required: true, maxlength: 255 })
  title: string

  @Prop({ required: true, maxlength: 1000 })
  message: string

  @Prop({ type: Object, required: false })
  data?: Record<string, any>

  @Prop({ type: Boolean, default: false })
  read: boolean

  @Prop({ type: Date, default: Date.now })
  created_at: Date
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)
NotificationSchema.index({ userId: 1, created_at: -1 })

