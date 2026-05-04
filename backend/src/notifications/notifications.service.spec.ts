import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { NotificationsService } from './notifications.service'

describe('NotificationsService', () => {
  const userId = '507f1f77bcf86cd799439011'

  const build = (gateway?: { sendToUser: jest.Mock }) => {
    const save = jest.fn().mockResolvedValue(undefined)
    const toObject = jest.fn().mockReturnValue({ id: 'doc', userId })
    const notificationModel: any = jest.fn().mockImplementation(() => ({
      save,
      toObject,
    }))
    notificationModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    })
    notificationModel.updateOne = jest.fn().mockResolvedValue({})
    notificationModel.updateMany = jest.fn().mockResolvedValue({})
    notificationModel.countDocuments = jest.fn().mockResolvedValue(3)
    notificationModel.deleteOne = jest.fn().mockResolvedValue({})

    const notificationGateway = gateway ?? { sendToUser: jest.fn() }
    const service = new NotificationsService(notificationModel, notificationGateway as any)
    return { service, notificationModel, notificationGateway, save, toObject }
  }

  it('create persists notification and emits websocket event', async () => {
    const { service, notificationGateway, save, toObject } = build()
    const doc = await service.create({
      userId,
      type: 'INFO',
      title: 'T',
      message: 'M',
      data: { k: 1 },
    })
    expect(save).toHaveBeenCalled()
    expect(notificationGateway.sendToUser).toHaveBeenCalledWith(userId, 'notification_created', toObject())
    expect(doc).toBeDefined()
  })

  it('create uses legacy meta when data missing', async () => {
    const { service, notificationModel } = build()
    await service.create({
      userId,
      type: 'INFO',
      title: 'T',
      message: 'M',
      meta: { x: 1 },
    } as any)
    const ctorArg = notificationModel.mock.calls.at(-1)?.[0]
    expect(ctorArg.data).toEqual({ x: 1 })
  })

  it('create warns when gateway throws', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    const gateway = { sendToUser: jest.fn().mockImplementation(() => { throw new Error('ws down') }) }
    const { service } = build(gateway)
    await service.create({ userId, type: 'INFO', title: 'T', message: 'M' })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('getForUser queries notifications', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: '1' }])
    const lean = jest.fn().mockReturnValue({ exec })
    const limit = jest.fn().mockReturnValue({ lean })
    const sort = jest.fn().mockReturnValue({ limit })
    const find = jest.fn().mockReturnValue({ sort })
    const notificationModel: any = jest.fn()
    notificationModel.find = find
    const service = new NotificationsService(notificationModel, { sendToUser: jest.fn() } as any)
    await expect(service.getForUser(userId)).resolves.toEqual([{ _id: '1' }])
    expect(find).toHaveBeenCalledWith({ userId: new Types.ObjectId(userId) })
  })

  it('markAsRead, markAllAsRead, getUnreadCount, deleteForUser call model', async () => {
    const { service, notificationModel } = build()
    await service.markAsRead('507f1f77bcf86cd799439012')
    await service.markAllAsRead(userId)
    await service.getUnreadCount(userId)
    await service.deleteForUser('507f1f77bcf86cd799439012', userId)
    expect(notificationModel.updateOne).toHaveBeenCalled()
    expect(notificationModel.updateMany).toHaveBeenCalled()
    expect(notificationModel.countDocuments).toHaveBeenCalled()
    expect(notificationModel.deleteOne).toHaveBeenCalled()
  })

  it('notifyHRRecommendationReady creates and emits', async () => {
    const gateway = { sendToUser: jest.fn() }
    const { service } = build(gateway)
    await service.notifyHRRecommendationReady(userId, 'act1', 'Title', 2)
    expect(gateway.sendToUser).toHaveBeenCalledWith(
      userId,
      'recommendation_ready',
      expect.objectContaining({ activityId: 'act1', count: 2 }),
    )
  })

  it('notifyManagerValidationRequired creates and emits', async () => {
    const gateway = { sendToUser: jest.fn() }
    const { service } = build(gateway)
    await service.notifyManagerValidationRequired(userId, 'act1', 'Title', 'HR Name', { extra: true })
    expect(gateway.sendToUser).toHaveBeenCalledWith(
      userId,
      'manager_review_required',
      expect.objectContaining({ activityTitle: 'Title', hrName: 'HR Name', extra: true }),
    )
  })

  it('notifyEmployeeInvitation creates and emits', async () => {
    const gateway = { sendToUser: jest.fn() }
    const { service } = build(gateway)
    const d = new Date('2020-01-01')
    await service.notifyEmployeeInvitation(userId, 'act1', 'Title', d, { k: 1 })
    expect(gateway.sendToUser).toHaveBeenCalledWith(
      userId,
      'activity_invitation',
      expect.objectContaining({ activityTitle: 'Title', date: d }),
    )
  })

  it('notifyHRAndManagerEmployeeResponse notifies both', async () => {
    const gateway = { sendToUser: jest.fn() }
    const hr = '507f1f77bcf86cd799439013'
    const mgr = '507f1f77bcf86cd799439014'
    const emp = '507f1f77bcf86cd799439015'
    const { service } = build(gateway)
    await service.notifyHRAndManagerEmployeeResponse(hr, mgr, emp, 'Jean', 'act1', 'DECLINED', 'busy')
    expect(gateway.sendToUser).toHaveBeenCalledWith(hr, 'employee_response', expect.any(Object))
    expect(gateway.sendToUser).toHaveBeenCalledWith(mgr, 'employee_response', expect.any(Object))
  })

  it('notifyExportReady emits export_ready', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    const gateway = { sendToUser: jest.fn() }
    const { service } = build(gateway)
    service.notifyExportReady(userId, 'act1', 'pdf')
    expect(gateway.sendToUser).toHaveBeenCalledWith(userId, 'export_ready', expect.objectContaining({ format: 'pdf' }))
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
