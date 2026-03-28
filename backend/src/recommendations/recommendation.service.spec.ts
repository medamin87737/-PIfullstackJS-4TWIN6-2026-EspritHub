import { HttpException } from '@nestjs/common'
import { RecommendationService } from './recommendation.service'

const execResult = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) })

describe('RecommendationService workflow guards', () => {
  const httpService: any = { post: jest.fn() }
  const notificationService: any = {}
  const mailService: any = {}
  const auditService: any = { logAction: jest.fn() }
  const smsService: any = { sendRecommendationReminder: jest.fn() }

  const userModel: any = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }
  const ficheModel: any = { findOne: jest.fn() }
  const competenceModel: any = { find: jest.fn() }
  const questionCompetenceModel: any = { find: jest.fn() }
  const activityModel: any = { findById: jest.fn() }
  const departmentModel: any = { findById: jest.fn(), findOne: jest.fn() }
  const recommendationModel: any = {
    findById: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  }
  const activityHistoryModel: any = { find: jest.fn(), findOneAndUpdate: jest.fn() }

  const service = new RecommendationService(
    httpService,
    userModel,
    ficheModel,
    competenceModel,
    questionCompetenceModel,
    activityModel,
    departmentModel,
    recommendationModel,
    activityHistoryModel,
    notificationService,
    mailService,
    auditService,
    smsService,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks manager validation when seats are exceeded', async () => {
    const depId = '507f1f77bcf86cd799439099'
    userModel.findById.mockReturnValueOnce(execResult({ _id: 'm1', role: 'MANAGER', department_id: depId }))
    activityModel.findById.mockReturnValue(execResult({ _id: 'act1', departmentId: depId, nb_seats: 1 }))
    departmentModel.findById.mockReturnValue(execResult({ _id: depId }))

    // already taken seats
    recommendationModel.countDocuments
      .mockResolvedValueOnce(1)
      // approvable count
      .mockResolvedValueOnce(1)

    await expect(
      service.managerValidateRecommendations(
        '507f1f77bcf86cd799439011',
        [{ recommendationId: '507f1f77bcf86cd799439012', action: 'approve' }],
        '507f1f77bcf86cd799439013',
      ),
    ).rejects.toBeInstanceOf(HttpException)
  })

  it('requires justification when employee declines', async () => {
    recommendationModel.findById.mockReturnValue(
      execResult({
        _id: 'rec1',
        userId: { toString: () => '507f1f77bcf86cd799439013' },
        status: 'NOTIFIED',
      }),
    )

    await expect(
      service.employeeRespond(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013',
        'DECLINED',
        '',
      ),
    ).rejects.toBeInstanceOf(HttpException)
  })
})
