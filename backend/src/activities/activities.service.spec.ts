import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Types } from 'mongoose'
import { ActivitiesService } from './activities.service'

describe('ActivitiesService', () => {
  const validId = '507f1f77bcf86cd799439011'

  const buildService = (modelMocks: Record<string, jest.Mock>) => {
    const activityModel: any = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: modelMocks.save ?? jest.fn().mockResolvedValue({ _id: validId, ...data }),
    }))
    activityModel.find = modelMocks.find ?? jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) })
    activityModel.findById = modelMocks.findById ?? jest.fn()
    activityModel.findByIdAndUpdate = modelMocks.findByIdAndUpdate ?? jest.fn()
    activityModel.findByIdAndDelete = modelMocks.findByIdAndDelete ?? jest.fn()
    return new ActivitiesService(activityModel)
  }

  it('create saves dto with string location from object address', async () => {
    const save = jest.fn().mockResolvedValue({ _id: validId })
    const activityModel: any = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save,
    }))
    activityModel.find = jest.fn()
    activityModel.findById = jest.fn()
    activityModel.findByIdAndUpdate = jest.fn()
    activityModel.findByIdAndDelete = jest.fn()

    const service = new ActivitiesService(activityModel)
    const dto: any = {
      title: 'T',
      location: { address: 'Tunis' },
    }
    await service.create(dto)
    expect(activityModel).toHaveBeenCalledWith(expect.objectContaining({ location: 'Tunis' }))
    expect(save).toHaveBeenCalled()
  })

  it('create converts lat/lng location to string', async () => {
    const save = jest.fn().mockResolvedValue({})
    const activityModel: any = jest.fn().mockImplementation((data: any) => ({ ...data, save }))
    activityModel.find = jest.fn()
    activityModel.findById = jest.fn()
    activityModel.findByIdAndUpdate = jest.fn()
    activityModel.findByIdAndDelete = jest.fn()

    const service = new ActivitiesService(activityModel)
    await service.create({ title: 'T', location: { lat: 1, lng: 2 } } as any)
    expect(activityModel).toHaveBeenCalledWith(expect.objectContaining({ location: '1,2' }))
  })

  it('findAll returns sorted activities', async () => {
    const sort = jest.fn().mockResolvedValue([{ _id: validId }])
    const service = buildService({
      find: jest.fn().mockReturnValue({ sort }),
    })
    await expect(service.findAll()).resolves.toEqual([{ _id: validId }])
    expect(sort).toHaveBeenCalledWith({ startDate: -1 })
  })

  it('findOne throws on invalid id', async () => {
    const service = buildService({})
    await expect(service.findOne('bad')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('findOne throws when not found', async () => {
    const service = buildService({
      findById: jest.fn().mockResolvedValue(null),
    })
    await expect(service.findOne(validId)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('findOne returns activity', async () => {
    const doc = { _id: new Types.ObjectId(validId), title: 'A' }
    const service = buildService({
      findById: jest.fn().mockResolvedValue(doc),
    })
    await expect(service.findOne(validId)).resolves.toBe(doc)
  })

  it('update throws on invalid id', async () => {
    const service = buildService({})
    await expect(service.update('nope', {} as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('update maps location and returns document', async () => {
    const findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: validId, location: 'X' })
    const service = buildService({ findByIdAndUpdate })
    const out = await service.update(validId, { title: 'N', location: { address: 'Addr' } } as any)
    expect(out).toEqual({ _id: validId, location: 'X' })
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      validId,
      expect.objectContaining({ location: 'Addr' }),
      { new: true },
    )
  })

  it('update throws when missing', async () => {
    const service = buildService({
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    })
    await expect(service.update(validId, { title: 'N' } as any)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('remove throws on invalid id', async () => {
    const service = buildService({})
    await expect(service.remove('bad')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('remove returns message', async () => {
    const service = buildService({
      findByIdAndDelete: jest.fn().mockResolvedValue({ _id: validId }),
    })
    await expect(service.remove(validId)).resolves.toEqual({ message: 'Activité supprimée avec succès' })
  })

  it('remove throws when not found', async () => {
    const service = buildService({
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    })
    await expect(service.remove(validId)).rejects.toBeInstanceOf(NotFoundException)
  })
})
