import { Test, TestingModule } from '@nestjs/testing'
import { Response } from 'express'
import { ActivitiesController } from './activities.controller'
import { ActivitiesService } from './activities.service'
import { PptxService } from './pptx.service'

describe('ActivitiesController', () => {
  const validId = '507f1f77bcf86cd799439011'
  let controller: ActivitiesController
  let activities: jest.Mocked<Pick<ActivitiesService, 'create' | 'findAll' | 'findOne' | 'update' | 'remove'>>
  let pptx: jest.Mocked<Pick<PptxService, 'generateActivityPresentation' | 'generateEnrichedPresentation'>>

  beforeEach(async () => {
    activities = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    }
    pptx = {
      generateActivityPresentation: jest.fn(),
      generateEnrichedPresentation: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        { provide: ActivitiesService, useValue: activities },
        { provide: PptxService, useValue: pptx },
      ],
    }).compile()

    controller = module.get(ActivitiesController)
  })

  it('create delegates to service', async () => {
    activities.create.mockResolvedValue({ _id: validId })
    const dto: any = { title: 'A' }
    await expect(controller.create(dto)).resolves.toEqual({ _id: validId })
    expect(activities.create).toHaveBeenCalledWith(dto)
  })

  it('findAll delegates to service', async () => {
    activities.findAll.mockResolvedValue([])
    await expect(controller.findAll()).resolves.toEqual([])
  })

  it('findOne delegates to service', async () => {
    activities.findOne.mockResolvedValue({ _id: validId })
    await expect(controller.findOne(validId)).resolves.toEqual({ _id: validId })
  })

  it('update delegates to service', async () => {
    activities.update.mockResolvedValue({ ok: true })
    await expect(controller.update(validId, { title: 'B' } as any)).resolves.toEqual({ ok: true })
  })

  it('remove delegates to service', async () => {
    activities.remove.mockResolvedValue({ message: 'ok' })
    await expect(controller.remove(validId)).resolves.toEqual({ message: 'ok' })
  })

  it('exportPptx sets headers and sends buffer', async () => {
    const activity: any = {
      _id: { toString: () => validId },
      title: 'Hello World!',
      description: 'D',
      objectifs: [],
      type: 'T',
      location: 'L',
      duration: 1,
      startDate: new Date(),
      endDate: new Date(),
      maxParticipants: 10,
      status: 'OPEN',
      requiredSkills: [],
    }
    activities.findOne.mockResolvedValue(activity)
    const buf = Buffer.from('pptx')
    pptx.generateActivityPresentation.mockResolvedValue(buf)

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response

    await controller.exportPptx(validId, res)

    expect(pptx.generateActivityPresentation).toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('activite-hello_world_.pptx'),
    )
    expect(res.send).toHaveBeenCalledWith(buf)
  })

  it('exportPptxManager passes optional file buffer', async () => {
    const activity: any = {
      _id: { toString: () => validId },
      title: 'X',
      description: '',
      objectifs: [],
      type: 'T',
      location: '',
      duration: 1,
      startDate: new Date(),
      endDate: new Date(),
      maxParticipants: 1,
      status: 'OPEN',
      requiredSkills: [],
    }
    activities.findOne.mockResolvedValue(activity)
    pptx.generateEnrichedPresentation.mockResolvedValue(Buffer.from('z'))

    const res = { setHeader: jest.fn(), send: jest.fn() } as unknown as Response
    const file = { buffer: Buffer.from('f'), mimetype: 'application/pdf', originalname: 'a.pdf' }

    await controller.exportPptxManager(validId, res, file)

    expect(pptx.generateEnrichedPresentation).toHaveBeenCalledWith(
      expect.any(Object),
      file.buffer,
      file.mimetype,
    )
    expect(res.send).toHaveBeenCalled()
  })
})
