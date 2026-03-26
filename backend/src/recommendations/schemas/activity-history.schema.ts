import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ActivityHistoryDocument = ActivityHistory & Document

@Schema({ collection: 'activity_history', timestamps: false })
export class ActivityHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true, index: true })
  activityId: Types.ObjectId

  @Prop({ required: true })
  activity_title: string

  @Prop({ required: true })
  status: string

  @Prop()
  feedback?: string

  @Prop({ type: Array, default: [] })
  skill_updates: any[]

  @Prop({ type: Date })
  completed_at?: Date
}

export const ActivityHistorySchema = SchemaFactory.createForClass(ActivityHistory)

