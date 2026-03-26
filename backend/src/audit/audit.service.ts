import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types, isValidObjectId } from 'mongoose'
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema'

type LogActionInput = {
  domain: string
  action: string
  actorId: string
  actorRole: string
  entityType: string
  entityId: string
  before?: any
  after?: any
  metadata?: any
}

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>) {}

  async logAction(input: LogActionInput) {
    if (!isValidObjectId(input.actorId)) return
    await this.auditModel.create({
      ...input,
      actorId: new Types.ObjectId(input.actorId),
    })
  }

  async getByDomain(domain: string, limit = 200) {
    return this.auditModel.find({ domain }).sort({ createdAt: -1 }).limit(limit).exec()
  }
}
