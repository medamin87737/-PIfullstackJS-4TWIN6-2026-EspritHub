import { Types } from 'mongoose'
import { AuditService } from './audit.service'

describe('AuditService', () => {
  const validActor = '507f1f77bcf86cd799439011'

  it('logAction skips when actorId is not a valid ObjectId', async () => {
    const create = jest.fn()
    const auditModel: any = { create }
    const service = new AuditService(auditModel)
    await service.logAction({
      domain: 'auth',
      action: 'login',
      actorId: 'not-an-id',
      actorRole: 'HR',
      entityType: 'User',
      entityId: validActor,
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('logAction creates document with ObjectId actor', async () => {
    const create = jest.fn().mockResolvedValue({})
    const auditModel: any = { create }
    const service = new AuditService(auditModel)
    await service.logAction({
      domain: 'auth',
      action: 'login',
      actorId: validActor,
      actorRole: 'HR',
      entityType: 'User',
      entityId: validActor,
      before: { a: 1 },
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'auth',
        action: 'login',
        actorId: new Types.ObjectId(validActor),
        actorRole: 'HR',
      }),
    )
  })

  it('getByDomain queries with sort and limit', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: '1' }])
    const limit = jest.fn().mockReturnValue({ exec })
    const sort = jest.fn().mockReturnValue({ limit })
    const find = jest.fn().mockReturnValue({ sort })
    const auditModel: any = { find }
    const service = new AuditService(auditModel)

    await expect(service.getByDomain('users', 50)).resolves.toEqual([{ _id: '1' }])
    expect(find).toHaveBeenCalledWith({ domain: 'users' })
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 })
    expect(limit).toHaveBeenCalledWith(50)
    expect(exec).toHaveBeenCalled()
  })
})
