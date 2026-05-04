import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { DepartmentsService } from './departments.service'

describe('DepartmentsService', () => {
  const validId = '507f1f77bcf86cd799439011'

  const build = (overrides: Partial<{
    findOne: jest.Mock
    create: jest.Mock
    find: jest.Mock
    findById: jest.Mock
    findByIdAndUpdate: jest.Mock
    findByIdAndDelete: jest.Mock
  }> = {}) => {
    const departmentModel: any = {
      findOne: overrides.findOne ?? jest.fn(),
      create: overrides.create ?? jest.fn(),
      find: overrides.find ?? jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
      findById: overrides.findById ?? jest.fn(),
      findByIdAndUpdate: overrides.findByIdAndUpdate ?? jest.fn(),
      findByIdAndDelete: overrides.findByIdAndDelete ?? jest.fn(),
    }
    return new DepartmentsService(departmentModel)
  }

  it('create throws when duplicate exists', async () => {
    const findOne = jest.fn().mockResolvedValue({ _id: 'x' })
    const service = build({ findOne })
    await expect(
      service.create({ code: '  hr  ', name: ' HR ', description: ' d ' } as any),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('create normalizes and persists', async () => {
    const findOne = jest.fn().mockResolvedValue(null)
    const create = jest.fn().mockResolvedValue({ _id: validId, code: 'HR', name: 'HR' })
    const service = build({ findOne, create })
    const out = await service.create({ code: ' hr ', name: ' HR ', description: ' desc ' } as any)
    expect(out).toEqual({ _id: validId, code: 'HR', name: 'HR' })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HR', name: 'HR', description: 'desc' }),
    )
  })

  it('findAll returns sorted list', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: validId }])
    const sort = jest.fn().mockReturnValue({ exec })
    const find = jest.fn().mockReturnValue({ sort })
    const service = build({ find })
    await expect(service.findAll()).resolves.toEqual([{ _id: validId }])
    expect(sort).toHaveBeenCalledWith({ name: 1 })
  })

  it('findOne throws on invalid id', async () => {
    const service = build()
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('findOne throws when missing', async () => {
    const findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
    const service = build({ findById })
    await expect(service.findOne(validId)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('findOne returns department', async () => {
    const doc = { _id: validId }
    const findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) })
    const service = build({ findById })
    await expect(service.findOne(validId)).resolves.toBe(doc)
  })

  it('update throws on invalid id', async () => {
    const service = build()
    await expect(service.update('bad', {} as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('update throws on duplicate name/code', async () => {
    const findOne = jest.fn().mockResolvedValue({ _id: 'other' })
    const departmentModel: any = {
      findOne,
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    }
    const service = new DepartmentsService(departmentModel)
    await expect(service.update(validId, { name: 'Dup' } as any)).rejects.toBeInstanceOf(ConflictException)
  })

  it('update applies changes', async () => {
    const findOne = jest.fn().mockResolvedValue(null)
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: validId, name: 'N' }),
    })
    const service = build({ findOne, findByIdAndUpdate })
    const out = await service.update(validId, { code: ' ab ', name: ' Name ', description: ' x ' } as any)
    expect(out).toEqual({ _id: validId, name: 'N' })
  })

  it('update throws when not found', async () => {
    const findOne = jest.fn().mockResolvedValue(null)
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    })
    const service = build({ findOne, findByIdAndUpdate })
    await expect(service.update(validId, { name: 'Only' } as any)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('remove throws on invalid id', async () => {
    const service = build()
    await expect(service.remove('bad')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('remove deletes and returns doc', async () => {
    const deleted = { _id: validId }
    const findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(deleted) })
    const service = build({ findByIdAndDelete })
    await expect(service.remove(validId)).resolves.toBe(deleted)
  })

  it('remove throws when missing', async () => {
    const findByIdAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) })
    const service = build({ findByIdAndDelete })
    await expect(service.remove(validId)).rejects.toBeInstanceOf(NotFoundException)
  })
})
