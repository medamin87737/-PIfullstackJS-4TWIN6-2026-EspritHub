import { HttpException } from '@nestjs/common'
import { RecommendationService } from './recommendation.service'
import { of } from 'rxjs'

const execResult = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) })

describe('RecommendationService advanced workflow', () => {
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
  }
  const activityHistoryModel: any = { findOneAndUpdate: jest.fn() }

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

  it('simulateRecommendations returns recommendations without persistence and logs audit', async () => {
    const activityId = '507f1f77bcf86cd799439010'
    const activity = { _id: activityId, departmentId: '507f1f77bcf86cd799439099', title: 'Act', description: 'Desc' }
    activityModel.findById.mockReturnValue(execResult(activity))
    departmentModel.findById.mockReturnValue(execResult({ _id: activity.departmentId }))

    // Avoid heavy eligible employees
    jest.spyOn(service as any, 'getEligibleEmployees').mockResolvedValue([
      { id: 'e1', name: 'Emp1', email: 'e1@x.com', departement: 'D', competences: [], historique: [] },
    ])

    httpService.post.mockReturnValue(
      of({
        data: {
          parsed_activity: { titre: 'T', description: 'D', required_skills: [], top_n: 1, contexte: 'development' },
          recommendations: [
            { employee_id: 'e1', name: 'Emp1', email: 'e1@x.com', score_total: 0.8, score_nlp: 0.5, score_competences: 0.9, rank: 1, matched_skills: [] },
          ],
          total_employees_analyzed: 1,
        },
      }),
    )

    userModel.findById.mockReturnValue(execResult({ _id: 'hr1', role: 'HR', department_id: null }))

    const res = await service.simulateRecommendations('prompt', activityId, 'hr1', 'what-if')
    expect(res.simulated).toBe(true)
    expect(res.recommendations.length).toBe(1)
    expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'simulate' }))
    expect(recommendationModel.countDocuments).not.toHaveBeenCalled()
  })

  it('searchRecommendations blocks invalid actor', async () => {
    userModel.findById.mockReturnValueOnce(execResult(null))
    await expect(
      service.searchRecommendations({ activityId: undefined, status: undefined, query: 'a', minScore: undefined } as any, 'missing'),
    ).rejects.toBeInstanceOf(HttpException)
  })
})

