import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ActivityRequestDocument = ActivityRequest & Document

@Schema({ collection: 'activity_requests', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ActivityRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  manager_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  department_id: Types.ObjectId

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  description: string

  @Prop()
  objectifs?: string

  @Prop({ required: true })
  type: string

  @Prop({ type: Array, default: [] })
  requiredSkills: Array<{ skill_name: string; desired_level: string }>

  @Prop({ required: true })
  maxParticipants: number

  @Prop({ required: true })
  startDate: Date

  @Prop({ required: true })
  endDate: Date

  @Prop()
  location?: string

  @Prop()
  duration?: string

  @Prop({ required: true, default: 'PENDING', index: true })
  status: 'PENDING' | 'APPROVED' | 'REJECTED'

  @Prop()
  hr_note?: string

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewed_by?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Activity' })
  created_activity_id?: Types.ObjectId
}

export const ActivityRequestSchema = SchemaFactory.createForClass(ActivityRequest)

