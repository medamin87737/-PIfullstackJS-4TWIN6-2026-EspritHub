import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type CertificateDocument = Certificate & Document

@Schema({ timestamps: { createdAt: 'created_at' } })
export class Certificate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true, index: true })
  activityId: Types.ObjectId

  @Prop({ required: true })
  activityTitle: string

  @Prop({ required: true })
  employeeName: string

  @Prop({ required: true })
  rank: number

  @Prop({ required: true })
  issueDate: string

  // PDF stocké en base64 (data URI)
  @Prop({ required: true, type: String })
  pdfData: string
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate)
CertificateSchema.index({ userId: 1, activityId: 1 }, { unique: true })
