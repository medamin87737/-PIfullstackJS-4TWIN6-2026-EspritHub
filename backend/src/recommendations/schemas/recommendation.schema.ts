import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'

export type RecommendationDocument = Recommendation & Document

@Schema({ collection: 'recommendations' })
export class Recommendation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true, index: true })
  activityId: Types.ObjectId

  @Prop({ required: true })
  score_total: number

  @Prop({ required: true })
  score_nlp: number

  @Prop({ required: true })
  score_competences: number

  @Prop({ default: 0 })
  score_progression?: number

  @Prop({ default: 0 })
  score_history?: number

  @Prop({ default: 0 })
  score_seniority?: number

  @Prop({ required: true, index: true })
  rank: number

  @Prop({ required: true, default: 'PENDING', index: true })
  status: string

  @Prop({ type: String, maxlength: 4000 })
  hr_prompt?: string

  @Prop({ type: String, maxlength: 1000 })
  hr_note?: string

  @Prop({ type: String, maxlength: 1000 })
  manager_note?: string

  @Prop({ type: String, maxlength: 2000 })
  employee_response?: string

  @Prop({ type: SchemaTypes.Mixed, required: true })
  parsed_activity: any

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  matched_skills: any[]

  @Prop({ type: String, maxlength: 2000 })
  recommendation_reason?: string

  @Prop()
  hr_validated_at?: Date

  @Prop()
  manager_validated_at?: Date

  @Prop()
  employee_responded_at?: Date

  @Prop({ type: Boolean, default: false })
  presence: boolean

  @Prop({ required: true, default: Date.now })
  created_at: Date

  @Prop({ required: true, default: Date.now })
  updated_at: Date
}

export const RecommendationSchema = SchemaFactory.createForClass(Recommendation)
RecommendationSchema.index({ activityId: 1, rank: 1 })

