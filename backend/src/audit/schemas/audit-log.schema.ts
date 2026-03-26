import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'

export type AuditLogDocument = AuditLog & Document

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, index: true })
  domain: string

  @Prop({ required: true, index: true })
  action: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actorId: Types.ObjectId

  @Prop({ required: true })
  actorRole: string

  @Prop({ required: true, index: true })
  entityType: string

  @Prop({ required: true, index: true })
  entityId: string

  @Prop({ type: SchemaTypes.Mixed })
  before?: any

  @Prop({ type: SchemaTypes.Mixed })
  after?: any

  @Prop({ type: SchemaTypes.Mixed })
  metadata?: any
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog)
