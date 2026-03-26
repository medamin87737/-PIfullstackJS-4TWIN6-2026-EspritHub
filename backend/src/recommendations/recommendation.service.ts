import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { firstValueFrom } from 'rxjs'
import { isValidObjectId, Model, Types } from 'mongoose'

import { User, UserDocument } from '../users/schemas/user.schema'
import { Fiche, FicheDocument } from '../users/schemas/fiche.schema'
import { Competence, CompetenceDocument } from '../users/schemas/competence.schema'
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema'
import { Department, DepartmentDocument } from '../users/schemas/department.schema'
import { Recommendation, RecommendationDocument } from './schemas/recommendation.schema'
import { ActivityHistory, ActivityHistoryDocument } from './schemas/activity-history.schema'
import { NotificationsService } from '../notifications/notifications.service'
import { MailService } from '../mail/mail.service'
import { NotificationType } from '../notifications/schemas/notification.schema'
import { AuditService } from '../audit/audit.service'
import { SearchRecommendationsDto } from './dto/search-recommendations.dto'

type EligibleEmployee = {
  id: string
  name: string
  email: string
  departement: string
  date_embauche?: string
  competences: Array<{ intitule: string; niveau: number }>
  historique: string[]
}

type ValidateDecision = { recommendationId: string; action: 'approve' | 'reject'; note?: string }

@Injectable()
export class RecommendationService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Fiche.name) private readonly ficheModel: Model<FicheDocument>,
    @InjectModel(Competence.name) private readonly competenceModel: Model<CompetenceDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Recommendation.name) private readonly recommendationModel: Model<RecommendationDocument>,
    @InjectModel(ActivityHistory.name) private readonly activityHistoryModel: Model<ActivityHistoryDocument>,
    private readonly notificationService: NotificationsService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private aiServiceUrl(): string {
    return process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
  }

  private async sendAiFeedback(payload: {
    recommendation_id: string
    activity_id: string
    employee_id: string
    stage: string
    outcome: string
    note?: string
    score_total?: number
    score_nlp?: number
    score_competences?: number
  }) {
    if ((process.env.AI_FEEDBACK_ENABLED ?? 'true') !== 'true') return
    try {
      await firstValueFrom(this.httpService.post(`${this.aiServiceUrl()}/feedback`, payload))
    } catch {
      // non-blocking feedback hook
    }
  }

  private async applyPostActivitySkillUpdate(
    employeeId: string,
    activityId: string,
    rec: RecommendationDocument,
    activity: any,
    response: 'ACCEPTED' | 'DECLINED',
    justification?: string,
  ) {
    const activityTitle = await this.getActivityTitle(activity)
    const requiredSkills = Array.isArray((rec as any).parsed_activity?.required_skills)
      ? (rec as any).parsed_activity.required_skills
      : []

    const latestFiche = await this.ficheModel
      .findOne({ user_id: new Types.ObjectId(employeeId) })
      .sort({ saisons: -1, updatedAt: -1, createdAt: -1 })
      .exec()

    const skillUpdates: any[] = []
    if (response === 'ACCEPTED' && latestFiche && requiredSkills.length > 0) {
      const competences = await this.competenceModel
        .find({ fiches_id: latestFiche._id })
        .exec()

      for (const req of requiredSkills) {
        const reqName = String(req?.intitule ?? '').trim().toLowerCase()
        if (!reqName) continue
        const comp = competences.find((c) => String(c.intitule ?? '').trim().toLowerCase() === reqName)
        if (!comp) continue

        const beforeAuto = Number(comp.auto_eval ?? 0)
        const beforeManager = Number(comp.hierarchie_eval ?? 0)
        // Small controlled progression bump after accepted participation.
        const afterAuto = Math.min(10, Number((beforeAuto + 0.5).toFixed(2)))
        const afterManager = Math.min(10, Number((beforeManager + 0.5).toFixed(2)))

        comp.auto_eval = afterAuto
        comp.hierarchie_eval = afterManager
        await comp.save()

        skillUpdates.push({
          competence_id: comp._id.toString(),
          intitule: comp.intitule,
          before: { auto_eval: beforeAuto, hierarchie_eval: beforeManager },
          after: { auto_eval: afterAuto, hierarchie_eval: afterManager },
          source: 'activity_acceptance',
        })
      }
    }

    await this.activityHistoryModel.findOneAndUpdate(
      { userId: new Types.ObjectId(employeeId), activityId: new Types.ObjectId(activityId) },
      {
        $set: {
          activity_title: activityTitle,
          status: response,
          feedback: justification ?? '',
          skill_updates: skillUpdates,
          completed_at: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  private resolveUserId(reqUserId: string): Types.ObjectId {
    if (!isValidObjectId(reqUserId)) throw new HttpException('Invalid user id', HttpStatus.BAD_REQUEST)
    return new Types.ObjectId(reqUserId)
  }

  private async getDepartmentByActivity(activity: any): Promise<DepartmentDocument | null> {
    const deptRaw = activity.departmentId ?? activity.departement_id
    if (!deptRaw) return null
    if (isValidObjectId(String(deptRaw))) {
      const byId = await this.departmentModel.findById(String(deptRaw)).exec()
      if (byId) return byId
    }
    return this.departmentModel.findOne({ code: String(deptRaw) }).exec()
  }

  private async getActivityTitle(activity: any): Promise<string> {
    return activity.titre ?? activity.title ?? 'Activité'
  }

  private async findManagerForDepartment(department: DepartmentDocument | null): Promise<UserDocument | null> {
    if (!department) return null

    if (department.manager_id && isValidObjectId(String(department.manager_id))) {
      const byDepartmentManagerId = await this.userModel.findById(String(department.manager_id)).exec()
      if (byDepartmentManagerId) return byDepartmentManagerId
    }

    const byDepartment = await this.userModel
      .findOne({
        role: { $in: ['MANAGER', 'manager'] },
        status: { $in: ['active', 'ACTIVE'] },
        $or: [
          { department_id: department._id },
          { departement_id: department._id },
        ],
      } as any)
      .exec()
    if (byDepartment) return byDepartment

    // Fallback on department code if legacy data stores department as code string
    return this.userModel
      .findOne({
        role: { $in: ['MANAGER', 'manager'] },
        status: { $in: ['active', 'ACTIVE'] },
        $or: [
          { department_id: department.code },
          { departement_id: department.code },
        ],
      } as any)
      .exec()
  }

  async getEligibleEmployees(targetDepartmentId?: string): Promise<EligibleEmployee[]> {
    const userQuery: any = { status: { $in: ['active', 'ACTIVE'] }, role: 'EMPLOYEE' }
    if (targetDepartmentId && isValidObjectId(targetDepartmentId)) {
      userQuery.department_id = new Types.ObjectId(targetDepartmentId)
    }

    const users = await this.userModel
      .find(userQuery)
      .select('_id name email department_id date_embauche')
      .exec()

    const result: EligibleEmployee[] = []
    for (const user of users) {
      const validatedFiche = await this.ficheModel
        .findOne({ user_id: user._id, etat: { $in: ['validated', 'VALIDATED'] } })
        .sort({ saisons: -1 })
        .exec()
      const latestFiche =
        validatedFiche ??
        (await this.ficheModel
          .findOne({ user_id: user._id })
          .sort({ saisons: -1, updatedAt: -1, createdAt: -1 })
          .exec())

      let competences = latestFiche
        ? await this.competenceModel
            .find({ fiches_id: latestFiche._id, etat: { $in: ['validated', 'VALIDATED'] } })
            .select('intitule auto_eval hierarchie_eval')
            .exec()
        : []

      if (latestFiche && competences.length === 0) {
        const sameFicheAll = await this.competenceModel
          .find({ fiches_id: latestFiche._id })
          .select('intitule auto_eval hierarchie_eval')
          .exec()
        competences = sameFicheAll
      }

      if (competences.length === 0) {
        // Fallback métier: if the latest fiche has no competences, use the most recent fiche that actually has data.
        const fichesByRecency = await this.ficheModel
          .find({ user_id: user._id })
          .sort({ saisons: -1, updatedAt: -1, createdAt: -1 })
          .select('_id')
          .exec()
        for (const f of fichesByRecency) {
          const rows = await this.competenceModel
            .find({ fiches_id: f._id })
            .select('intitule auto_eval hierarchie_eval')
            .exec()
          if (rows.length > 0) {
            competences = rows
            break
          }
        }
      }

      const history = await this.activityHistoryModel
        .find({ userId: user._id })
        .select('activity_title')
        .sort({ completed_at: -1 })
        .limit(20)
        .exec()

      const departmentName = user.department_id
        ? (await this.departmentModel.findById(user.department_id).select('name').exec())?.name ?? ''
        : ''

      result.push({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        departement: departmentName,
        date_embauche: user.date_embauche ? new Date(user.date_embauche).toISOString() : undefined,
        competences: competences.map((c) => ({
          intitule: c.intitule,
          niveau: Number(
            ((Number(c.auto_eval ?? 0) + Number(c.hierarchie_eval ?? 0)) / 2).toFixed(2),
          ),
        })),
        historique: history.map((h) => h.activity_title).filter(Boolean),
      })
    }
    return result
  }

  async generateRecommendations(hrPrompt: string, activityId: string, hrUserId: string) {
    const activity = await this.activityModel.findById(activityId).exec()
    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)

    const activityDepartment = await this.getDepartmentByActivity(activity)
    const employees = await this.getEligibleEmployees(activityDepartment?._id?.toString())
    if (employees.length === 0) {
      throw new HttpException('No active employees found for recommendation generation', HttpStatus.BAD_REQUEST)
    }
    let aiData: any
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl()}/recommend`, {
          hr_prompt: hrPrompt,
          employees,
        }),
      )
      aiData = response.data
    } catch {
      throw new HttpException('AI recommendation service unavailable', HttpStatus.SERVICE_UNAVAILABLE)
    }

    const recommendations = Array.isArray(aiData?.recommendations) ? aiData.recommendations : []
    await this.recommendationModel.deleteMany({ activityId: new Types.ObjectId(activityId) }).exec()

    if (recommendations.length > 0) {
      await this.recommendationModel.insertMany(
        recommendations.map((r: any) => ({
          activityId: new Types.ObjectId(activityId),
          userId: new Types.ObjectId(r.employee_id),
          score_total: Number(r.score_total ?? 0),
          score_nlp: Number(r.score_nlp ?? 0),
          score_competences: Number(r.score_competences ?? 0),
          score_progression: Number(r.score_progression ?? 0),
          score_history: Number(r.score_history ?? 0),
          score_seniority: Number(r.score_seniority ?? 0),
          rank: Number(r.rank ?? 0),
          hr_prompt: hrPrompt,
          parsed_activity: aiData.parsed_activity ?? {},
          matched_skills: r.matched_skills ?? [],
          recommendation_reason: String(r.recommendation_reason ?? ''),
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        })),
      )
    }

    ;(activity as any).status = 'pending_recommendation'
    await activity.save()

    await this.notificationService.notifyHRRecommendationReady(
      hrUserId,
      activityId,
      await this.getActivityTitle(activity),
      recommendations.length,
    )

    await this.notificationService.create({
      userId: hrUserId,
      type: NotificationType.HR_VALIDATION_REQUIRED,
      title: 'Validation RH requise',
      message: 'Veuillez vérifier et valider les recommandations générées.',
      data: { activityId },
    })

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'generate',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Activity',
      entityId: activityId,
      after: { recommendations_count: recommendations.length, prompt: hrPrompt },
      metadata: { parsed_activity: aiData.parsed_activity ?? {} },
    })

    return {
      parsed_activity: aiData.parsed_activity ?? {},
      recommendations,
      total_employees_analyzed: Number(aiData.total_employees_analyzed ?? employees.length),
    }
  }

  async simulateRecommendations(hrPrompt: string, activityId: string, hrUserId: string, mode?: string) {
    const activity = await this.activityModel.findById(activityId).exec()
    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)

    const activityDepartment = await this.getDepartmentByActivity(activity)
    const employees = await this.getEligibleEmployees(activityDepartment?._id?.toString())
    if (employees.length === 0) {
      throw new HttpException('No active employees found for simulation', HttpStatus.BAD_REQUEST)
    }
    let aiData: any
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl()}/recommend`, {
          hr_prompt: hrPrompt,
          employees,
          mode: mode ?? 'simulate',
        }),
      )
      aiData = response.data
    } catch {
      throw new HttpException('AI recommendation service unavailable', HttpStatus.SERVICE_UNAVAILABLE)
    }

    const result = {
      simulated: true,
      mode: mode ?? 'simulate',
      activityId,
      parsed_activity: aiData?.parsed_activity ?? {},
      recommendations: Array.isArray(aiData?.recommendations) ? aiData.recommendations : [],
      total_employees_analyzed: Number(aiData?.total_employees_analyzed ?? employees.length),
    }
    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'simulate',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Activity',
      entityId: activityId,
      after: { recommendations_count: result.recommendations.length, mode: result.mode },
      metadata: { prompt: hrPrompt },
    })
    return result
  }

  async hrValidateRecommendations(activityId: string, decisions: ValidateDecision[], hrUserId: string) {
    for (const decision of decisions) {
      const rec = await this.recommendationModel.findById(decision.recommendationId).exec()
      if (!rec || rec.activityId.toString() !== activityId) continue
      if (rec.status !== 'PENDING') continue

      rec.status = decision.action === 'approve' ? 'HR_APPROVED' : 'HR_REJECTED'
      rec.hr_note = decision.note
      rec.hr_validated_at = new Date()
      rec.updated_at = new Date()
      await rec.save()

      if (decision.action === 'reject') {
        await this.notificationService.create({
          userId: hrUserId,
          type: NotificationType.RECOMMENDATION_REJECTED_HR,
          title: 'Recommandation rejetée par RH',
          message: decision.note ?? 'Recommandation rejetée',
          data: { activityId, recommendationId: rec._id.toString() },
        })
      }
    }

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'hr_validate',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Activity',
      entityId: activityId,
      after: { decisions_count: decisions.length },
      metadata: { decisions },
    })

    const activity = await this.activityModel.findById(activityId).exec()
    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)
    ;(activity as any).status = 'recommended'
    await activity.save()

    const department = await this.getDepartmentByActivity(activity)
    const managers = department
      ? await this.userModel.find({
          role: { $in: ['MANAGER', 'manager'] },
          status: { $in: ['ACTIVE', 'active'] },
          $or: [{ department_id: department._id }, { departement_id: department._id }] as any,
        }).exec()
      : []
    const fallbackManager = await this.findManagerForDepartment(department)
    const targetManagers = managers.length > 0
      ? managers
      : fallbackManager
        ? [fallbackManager]
        : []

    const hr = await this.userModel.findById(this.resolveUserId(hrUserId)).select('name').exec()
    for (const m of targetManagers) {
      await this.notificationService.notifyManagerValidationRequired(
        m._id.toString(),
        activityId,
        await this.getActivityTitle(activity),
        hr?.name ?? 'HR',
        {
          description: (activity as any).description ?? '',
          objectifs: (activity as any).objectifs ?? '',
          location: (activity as any).location ?? '',
          date: (activity as any).date ?? (activity as any).startDate ?? null,
          type: (activity as any).type ?? '',
        },
      )
    }

    return this.getRecommendationsByActivity(activityId)
  }

  async getManagerPendingRecommendations(managerUserId: string) {
    const manager = await this.userModel.findById(this.resolveUserId(managerUserId)).select('_id role department_id').exec()
    if (!manager || !['MANAGER', 'manager'].includes(String(manager.role)) || !manager.department_id) {
      throw new HttpException('Manager not authorized', HttpStatus.FORBIDDEN)
    }

    const managerDepartment = await this.departmentModel.findById(manager.department_id).select('_id code').exec()
    const departmentId = managerDepartment?._id?.toString()
    const departmentCode = managerDepartment?.code

    const recs = await this.recommendationModel
      .find({
        status: { $in: ['HR_APPROVED', 'MANAGER_APPROVED', 'MANAGER_REJECTED', 'NOTIFIED', 'ACCEPTED', 'DECLINED'] },
      })
      .populate('userId', 'name email matricule')
      .populate('activityId')
      .sort({ rank: 1 })
      .exec()

    const activityIds = Array.from(
      new Set(
        recs
          .map((rec: any) => rec.activityId?._id?.toString?.() ?? '')
          .filter(Boolean),
      ),
    )

    const takenRows = await this.recommendationModel.aggregate([
      {
        $match: {
          activityId: { $in: activityIds.map((id) => new Types.ObjectId(id)) },
          status: { $in: ['MANAGER_APPROVED', 'NOTIFIED', 'ACCEPTED'] },
        },
      },
      { $group: { _id: '$activityId', count: { $sum: 1 } } },
    ])
    const takenMap = new Map<string, number>(
      takenRows.map((r: any) => [String(r._id), Number(r.count ?? 0)]),
    )

    return recs
      .filter((rec: any) => {
        const a = rec.activityId
        const depRaw = String(a?.departmentId ?? a?.departement_id ?? '')
        return depRaw === departmentId || depRaw === departmentCode
      })
      .map((rec: any) => ({
        ...(function () {
          const activityId = rec.activityId?._id?.toString?.() ?? ''
          const seatsTotalRaw = Number(rec.activityId?.nb_seats ?? rec.activityId?.maxParticipants ?? 0)
          const seatsTotal = Number.isFinite(seatsTotalRaw) ? Math.max(0, seatsTotalRaw) : 0
          const seatsTaken = Number(takenMap.get(activityId) ?? 0)
          const seatsRemaining = seatsTotal > 0 ? Math.max(0, seatsTotal - seatsTaken) : 0
          return {
            seats_total: seatsTotal,
            seats_taken: seatsTaken,
            seats_remaining: seatsRemaining,
          }
        })(),
        id: rec._id.toString(),
        activity_id: rec.activityId?._id?.toString?.() ?? '',
        activity_title: rec.activityId?.title ?? rec.activityId?.titre ?? 'Activité',
        employee_id: rec.userId?._id?.toString?.() ?? '',
        employee_name: rec.userId?.name ?? 'N/A',
        employee_email: rec.userId?.email ?? '',
        employee_matricule: rec.userId?.matricule ?? '',
        score_total: rec.score_total,
        score_nlp: rec.score_nlp,
        score_competences: rec.score_competences,
        score_progression: Number((rec as any).score_progression ?? 0),
        score_history: Number((rec as any).score_history ?? 0),
        score_seniority: Number((rec as any).score_seniority ?? 0),
        rank: rec.rank,
        status: rec.status,
        absence_reason: rec.employee_response ?? null,
        parsed_activity: rec.parsed_activity,
        recommendation_reason: rec.recommendation_reason ?? '',
      }))
  }

  async managerValidateRecommendations(activityId: string, decisions: ValidateDecision[], managerUserId: string) {
    const manager = await this.userModel.findById(this.resolveUserId(managerUserId)).exec()
    if (!manager || !['MANAGER', 'manager'].includes(String(manager.role))) {
      throw new HttpException('Manager not authorized', HttpStatus.FORBIDDEN)
    }

    const activity = await this.activityModel.findById(activityId).exec()
    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)

    const department = await this.getDepartmentByActivity(activity)
    if (!department || manager.department_id?.toString() !== department._id.toString()) {
      throw new HttpException('Manager can only validate activities in their department', HttpStatus.FORBIDDEN)
    }

    const decisionIds = decisions.map((d) => d.recommendationId)
    if (new Set(decisionIds).size !== decisionIds.length) {
      throw new HttpException('Duplicate recommendation decisions are not allowed', HttpStatus.BAD_REQUEST)
    }

    const seatsTotalRaw = Number((activity as any).nb_seats ?? (activity as any).maxParticipants ?? 0)
    const seatsTotal = Number.isFinite(seatsTotalRaw) ? Math.max(0, seatsTotalRaw) : 0
    if (seatsTotal > 0) {
      const alreadyTaken = await this.recommendationModel.countDocuments({
        activityId: new Types.ObjectId(activityId),
        status: { $in: ['MANAGER_APPROVED', 'NOTIFIED', 'ACCEPTED'] },
      })

      const requestedApproveIds = Array.from(
        new Set(
          decisions
            .filter((d) => d.action === 'approve')
            .map((d) => d.recommendationId),
        ),
      )

      if (requestedApproveIds.length > 0) {
        const approvableCount = await this.recommendationModel.countDocuments({
          _id: { $in: requestedApproveIds.map((id) => new Types.ObjectId(id)) },
          activityId: new Types.ObjectId(activityId),
          status: 'HR_APPROVED',
        })

        if (alreadyTaken + approvableCount > seatsTotal) {
          throw new HttpException(
            `Seat limit exceeded for this activity (${alreadyTaken}/${seatsTotal} already used).`,
            HttpStatus.BAD_REQUEST,
          )
        }
      }
    }

    let rejectedCount = 0
    for (const decision of decisions) {
      const rec = await this.recommendationModel.findById(decision.recommendationId).exec()
      if (!rec || rec.activityId.toString() !== activityId) continue
      if (rec.status !== 'HR_APPROVED') continue

      rec.status = decision.action === 'approve' ? 'MANAGER_APPROVED' : 'MANAGER_REJECTED'
      rec.manager_note = decision.note
      rec.manager_validated_at = new Date()
      rec.updated_at = new Date()
      await rec.save()

      if (decision.action === 'reject') {
        rejectedCount++
        const hrOwner = await this.userModel.findOne({ role: 'HR' }).select('_id').exec()
        if (hrOwner) {
          await this.notificationService.create({
            userId: hrOwner._id.toString(),
            type: NotificationType.RECOMMENDATION_REJECTED_MANAGER,
            title: 'Recommandation rejetée par manager',
            message: decision.note ?? 'Le manager a rejeté la recommandation.',
            data: { activityId, recommendationId: rec._id.toString() },
          })
        }
      }

      await this.sendAiFeedback({
        recommendation_id: rec._id.toString(),
        activity_id: activityId,
        employee_id: rec.userId.toString(),
        stage: 'manager_validation',
        outcome: decision.action === 'approve' ? 'approved' : 'rejected',
        note: decision.note,
        score_total: Number((rec as any).score_total ?? 0),
        score_nlp: Number((rec as any).score_nlp ?? 0),
        score_competences: Number((rec as any).score_competences ?? 0),
      })
    }

    const approved = await this.recommendationModel
      .find({ activityId: new Types.ObjectId(activityId), status: 'MANAGER_APPROVED' })
      .exec()

    let notifiedCount = 0
    for (const rec of approved) {
      rec.status = 'NOTIFIED'
      rec.updated_at = new Date()
      await rec.save()

      const employee = await this.userModel.findById(rec.userId).select('name email').exec()
      if (!employee) continue
      notifiedCount++

      const activityTitle = await this.getActivityTitle(activity)
      const location = (activity as any).location ?? 'N/A'
      const date = (activity as any).date ?? (activity as any).startDate ?? new Date()
      const description = (activity as any).description ?? ''
      const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
      const acceptUrl = `${baseUrl}/employee/recommendations?recommendationId=${rec._id.toString()}&response=ACCEPTED`
      const declineUrl = `${baseUrl}/employee/recommendations?recommendationId=${rec._id.toString()}&response=DECLINED`

      void this.mailService.sendEmployeeInvitation(
        employee.email,
        employee.name,
        activityTitle,
        date,
        location,
        description,
        acceptUrl,
        declineUrl,
      )

      await this.notificationService.notifyEmployeeInvitation(
        employee._id.toString(),
        activityId,
        activityTitle,
        date,
        {
          description,
          objectifs: (activity as any).objectifs ?? '',
          location,
          duration: (activity as any).duration ?? '',
          type: (activity as any).type ?? '',
          nb_seats: (activity as any).nb_seats ?? (activity as any).maxParticipants ?? undefined,
        },
      )
    }

    ;(activity as any).status = 'validated'
    await activity.save()

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'manager_validate',
      actorId: managerUserId,
      actorRole: 'MANAGER',
      entityType: 'Activity',
      entityId: activityId,
      after: { decisions_count: decisions.length, notified_count: notifiedCount, rejected_count: rejectedCount },
      metadata: { decisions },
    })

    return { notified_count: notifiedCount, rejected_count: rejectedCount }
  }

  async manualAddRecommendation(activityId: string, employeeId: string, actorUserId: string, note?: string) {
    const [activity, actor, employee] = await Promise.all([
      this.activityModel.findById(activityId).exec(),
      this.userModel.findById(this.resolveUserId(actorUserId)).select('_id role department_id name').exec(),
      this.userModel.findById(employeeId).select('_id role department_id name email matricule status').exec(),
    ])

    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)
    if (!actor) throw new HttpException('Actor not found', HttpStatus.NOT_FOUND)
    if (!employee || String(employee.role) !== 'EMPLOYEE') {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND)
    }

    const activityDepartment = await this.getDepartmentByActivity(activity)
    if (!activityDepartment) throw new HttpException('Department not found for activity', HttpStatus.BAD_REQUEST)

    if (String(actor.role) === 'MANAGER') {
      if (!actor.department_id || String(actor.department_id) !== String(activityDepartment._id)) {
        throw new HttpException('Manager can only edit recommendations for own department', HttpStatus.FORBIDDEN)
      }
    }

    if (!employee.department_id || String(employee.department_id) !== String(activityDepartment._id)) {
      throw new HttpException('Employee department does not match activity department', HttpStatus.BAD_REQUEST)
    }

    const existing = await this.recommendationModel.findOne({
      activityId: new Types.ObjectId(activityId),
      userId: new Types.ObjectId(employeeId),
    })
    if (existing) {
      throw new HttpException('Employee is already in recommendation list for this activity', HttpStatus.CONFLICT)
    }

    const lastRank = await this.recommendationModel
      .findOne({ activityId: new Types.ObjectId(activityId) })
      .sort({ rank: -1 })
      .select('rank parsed_activity')
      .exec()

    const seedParsed = lastRank?.parsed_activity ?? {
      titre: (activity as any).title ?? (activity as any).titre ?? 'Activité',
      description: (activity as any).description ?? '',
      required_skills: [],
    }

    const initialStatus = String(actor.role) === 'MANAGER' ? 'HR_APPROVED' : 'PENDING'
    const rec = await this.recommendationModel.create({
      activityId: new Types.ObjectId(activityId),
      userId: new Types.ObjectId(employeeId),
      score_total: 0,
      score_nlp: 0,
      score_competences: 0,
      rank: Number(lastRank?.rank ?? 0) + 1,
      status: initialStatus,
      parsed_activity: seedParsed,
      matched_skills: [],
      hr_note: String(actor.role) === 'HR' ? note : undefined,
      manager_note: String(actor.role) === 'MANAGER' ? note : undefined,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'manual_add',
      actorId: actorUserId,
      actorRole: String(actor.role),
      entityType: 'Recommendation',
      entityId: rec._id.toString(),
      after: { activityId, employeeId, note },
    })

    return this.recommendationModel
      .findById(rec._id)
      .populate('userId', 'name email matricule department_id')
      .exec()
  }

  async removeRecommendation(recommendationId: string, actorUserId: string) {
    const actor = await this.userModel.findById(this.resolveUserId(actorUserId)).select('_id role department_id').exec()
    if (!actor) throw new HttpException('Actor not found', HttpStatus.NOT_FOUND)

    const rec = await this.recommendationModel.findById(recommendationId).populate('activityId').exec()
    if (!rec) throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)

    if (String(actor.role) === 'MANAGER') {
      const activityDepartment = await this.getDepartmentByActivity(rec.activityId as any)
      if (!activityDepartment || !actor.department_id || String(actor.department_id) !== String(activityDepartment._id)) {
        throw new HttpException('Manager can only remove recommendations for own department', HttpStatus.FORBIDDEN)
      }
    }

    await this.recommendationModel.deleteOne({ _id: rec._id })
    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'manual_remove',
      actorId: actorUserId,
      actorRole: String(actor.role),
      entityType: 'Recommendation',
      entityId: recommendationId,
      before: { activityId: (rec.activityId as any)?._id?.toString?.() ?? '' },
    })
    return { deleted: true, recommendationId }
  }

  async employeeRespond(
    recommendationId: string,
    employeeId: string,
    response: 'ACCEPTED' | 'DECLINED',
    justification?: string,
  ) {
    const rec = await this.recommendationModel.findById(recommendationId).exec()
    if (!rec) throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)
    if (rec.userId.toString() !== employeeId) {
      throw new HttpException('Employee can only respond to own recommendations', HttpStatus.FORBIDDEN)
    }
    if (rec.status !== 'NOTIFIED') {
      throw new HttpException('Recommendation is not in NOTIFIED state', HttpStatus.BAD_REQUEST)
    }
    if (response === 'DECLINED' && !justification?.trim()) {
      throw new HttpException('Justification is required when employee declines', HttpStatus.BAD_REQUEST)
    }

    rec.status = response
    rec.employee_response = justification
    rec.employee_responded_at = new Date()
    rec.updated_at = new Date()
    await rec.save()

    await this.sendAiFeedback({
      recommendation_id: rec._id.toString(),
      activity_id: rec.activityId.toString(),
      employee_id: employeeId,
      stage: 'employee_response',
      outcome: response.toLowerCase(),
      note: justification,
      score_total: Number((rec as any).score_total ?? 0),
      score_nlp: Number((rec as any).score_nlp ?? 0),
      score_competences: Number((rec as any).score_competences ?? 0),
    })

    const activity = await this.activityModel.findById(rec.activityId).exec()
    const department = activity ? await this.getDepartmentByActivity(activity) : null
    const manager = await this.findManagerForDepartment(department)
    const hr = await this.userModel.findOne({ role: { $in: ['HR', 'hr'] } }).exec()
    const employee = await this.userModel.findById(employeeId).select('name').exec()

    if (hr && manager) {
      await this.notificationService.notifyHRAndManagerEmployeeResponse(
        hr._id.toString(),
        manager._id.toString(),
        employeeId,
        employee?.name ?? 'Employé',
        rec.activityId.toString(),
        response,
        justification,
      )
    }

    if (activity) {
      await this.applyPostActivitySkillUpdate(employeeId, rec.activityId.toString(), rec, activity, response, justification)
    }

    const employeeRole = 'EMPLOYEE'
    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'employee_respond',
      actorId: employeeId,
      actorRole: employeeRole,
      entityType: 'Recommendation',
      entityId: recommendationId,
      after: { response, justification: justification ?? '' },
      metadata: { activityId: rec.activityId.toString() },
    })

    return rec
  }

  async getRecommendationsByActivity(activityId: string) {
    return this.recommendationModel
      .find({ activityId: new Types.ObjectId(activityId) })
      .populate('userId', 'name email matricule department_id')
      .sort({ score_total: -1, rank: 1, created_at: -1 })
      .exec()
  }

  async getMyRecommendations(employeeId: string) {
    return this.recommendationModel
      .find({ userId: new Types.ObjectId(employeeId) })
      .populate('activityId', 'titre title date location description')
      .sort({ created_at: -1 })
      .exec()
  }

  async searchRecommendations(filters: SearchRecommendationsDto, actorUserId: string) {
    const actor = await this.userModel.findById(this.resolveUserId(actorUserId)).select('_id role department_id').exec()
    if (!actor) throw new HttpException('Actor not found', HttpStatus.NOT_FOUND)

    const query: any = {}
    if (filters.activityId) query.activityId = new Types.ObjectId(filters.activityId)
    if (filters.status) query.status = filters.status
    if (typeof filters.minScore === 'number') query.score_total = { $gte: filters.minScore }

    const rows = await this.recommendationModel
      .find(query)
      .populate('userId', 'name email matricule department_id')
      .populate('activityId', 'title titre departmentId departement_id')
      .sort({ score_total: -1, rank: 1, created_at: -1 })
      .exec()

    let filtered = rows
    if (String(actor.role) === 'MANAGER') {
      filtered = rows.filter((r: any) => {
        const depRaw = String(r?.activityId?.departmentId ?? r?.activityId?.departement_id ?? '')
        return depRaw && actor.department_id && depRaw === String(actor.department_id)
      })
    }

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase()
      filtered = filtered.filter((r: any) => {
        const user = r.userId
        return (
          String(user?.name ?? '').toLowerCase().includes(q) ||
          String(user?.email ?? '').toLowerCase().includes(q) ||
          String(user?.matricule ?? '').toLowerCase().includes(q)
        )
      })
    }

    return filtered.map((r: any) => ({
      id: r._id.toString(),
      status: r.status,
      score_total: r.score_total,
      score_nlp: r.score_nlp,
      score_competences: r.score_competences,
      score_progression: Number((r as any).score_progression ?? 0),
      score_history: Number((r as any).score_history ?? 0),
      score_seniority: Number((r as any).score_seniority ?? 0),
      rank: r.rank,
      employee: {
        id: r.userId?._id?.toString?.() ?? '',
        name: r.userId?.name ?? 'N/A',
        email: r.userId?.email ?? '',
        matricule: r.userId?.matricule ?? '',
      },
      activity: {
        id: r.activityId?._id?.toString?.() ?? '',
        title: r.activityId?.title ?? r.activityId?.titre ?? 'Activité',
      },
    }))
  }

  async retrainAi(actorUserId: string) {
    const actor = await this.userModel.findById(this.resolveUserId(actorUserId)).select('_id role').exec()
    if (!actor || !['HR', 'ADMIN', 'hr', 'admin'].includes(String(actor.role))) {
      throw new HttpException('Only HR/ADMIN can trigger AI retraining', HttpStatus.FORBIDDEN)
    }

    try {
      const response = await firstValueFrom(this.httpService.post(`${this.aiServiceUrl()}/retrain`, {}))
      await this.auditService.logAction({
        domain: 'recommendations',
        action: 'ai_retrain',
        actorId: actorUserId,
        actorRole: String(actor.role),
        entityType: 'AIModel',
        entityId: 'score_calibrator',
        after: response.data,
      })
      return response.data
    } catch {
      throw new HttpException('AI retraining failed', HttpStatus.SERVICE_UNAVAILABLE)
    }
  }
}

