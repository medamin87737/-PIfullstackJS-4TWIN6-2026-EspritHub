import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { InjectModel } from '@nestjs/mongoose'
import { firstValueFrom } from 'rxjs'
import { isValidObjectId, Model, Types } from 'mongoose'

import { User, UserDocument } from '../users/schemas/user.schema'
import { Fiche, FicheDocument } from '../users/schemas/fiche.schema'
import { Competence, CompetenceDocument } from '../users/schemas/competence.schema'
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema'
import { Department, DepartmentDocument } from '../users/schemas/department.schema'
import { QuestionCompetence, QuestionCompetenceDocument } from '../users/schemas/question-competence.schema'
import { Recommendation, RecommendationDocument } from './schemas/recommendation.schema'
import { ActivityHistory, ActivityHistoryDocument } from './schemas/activity-history.schema'
import { NotificationsService } from '../notifications/notifications.service'
import { MailService } from '../mail/mail.service'
import { NotificationType } from '../notifications/schemas/notification.schema'
import { AuditService } from '../audit/audit.service'
import { SearchRecommendationsDto } from './dto/search-recommendations.dto'
import { SmsService } from '../sms/sms.service'

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
    @InjectModel(QuestionCompetence.name) private readonly questionCompetenceModel: Model<QuestionCompetenceDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Recommendation.name) private readonly recommendationModel: Model<RecommendationDocument>,
    @InjectModel(ActivityHistory.name) private readonly activityHistoryModel: Model<ActivityHistoryDocument>,
    private readonly notificationService: NotificationsService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
    private readonly smsService: SmsService,
  ) {}

  private aiServiceUrl(): string {
    return process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
  }

  private normalizeSkillKey(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
  }

  private sanitizeRequestedSkillName(raw: string): string {
    let name = String(raw ?? '').trim()
    // Remove common lead-in phrases from free prompts.
    // Run multiple passes to clean combined prefixes like:
    // "trouver 10 profil Analyse de donnees".
    for (let i = 0; i < 3; i += 1) {
      const before = name
      name = name.replace(/^(trouver|trouve|chercher|cherche|identifier|identifie|generer|genere)\s+/i, '')
      name = name.replace(/^\d+\s+profils?\s+/i, '')
      name = name.replace(/^(profil|profils)\s+/i, '')
      name = name.trim()
      if (name === before) break
    }
    name = name.replace(/^(competences?\s+obligatoires?\s+et\s+niveaux?\s+cibles?\s*:\s*)/i, '')
    name = name.replace(/[.,;:!?]+$/g, '')
    return name.replace(/\s+/g, ' ').trim()
  }

  private extractRequestedSkillsFromPrompt(prompt: string): string[] {
    const text = String(prompt ?? '')
    const byLevel = Array.from(
      text.matchAll(/(?:^|[\n;,])\s*(?:-\s*)?([^\n;,]{2,120}?)\s*(?:niveau|level|niv|lvl|n\.?)\s*([1-5])/gi),
    )
      .map((m) => this.sanitizeRequestedSkillName(String(m?.[1] ?? '').trim()))
      .filter((name) => name.length > 0)

    const byBullet = Array.from(text.matchAll(/^\s*-\s*([^\n]{2,120})$/gim))
      .map((m) => this.sanitizeRequestedSkillName(String(m?.[1] ?? '').trim()))
      .filter((name) => name.length > 0)

    const unique = new Map<string, string>()
    for (const name of [...byLevel, ...byBullet]) {
      const key = this.normalizeSkillKey(name)
      if (!key) continue
      if (!unique.has(key)) unique.set(key, name.replace(/\s+/g, ' '))
    }
    return Array.from(unique.values())
  }

  private extractTopNFromPrompt(prompt: string): number | null {
    const text = String(prompt ?? '')
    const m1 = text.match(/\btop[_\s-]*n\s*[:=]?\s*(\d{1,4})\b/i)?.[1]
    const m2 = text.match(/\b(trouver|trouve|chercher|cherche|identifier|identifie)\s+(\d{1,4})\s+profils?\b/i)?.[2]
    const raw = Number(m1 ?? m2 ?? 0)
    if (!Number.isFinite(raw) || raw <= 0) return null
    return Math.max(1, Math.min(500, raw))
  }

  private tokenJaccard(a: string, b: string): number {
    const ta = new Set(a.split(' ').filter(Boolean))
    const tb = new Set(b.split(' ').filter(Boolean))
    if (ta.size === 0 || tb.size === 0) return 0
    let inter = 0
    for (const t of ta) if (tb.has(t)) inter += 1
    const union = new Set([...ta, ...tb]).size
    return union > 0 ? inter / union : 0
  }

  private requiredLevelToNumber(raw: any): number {
    const direct = Number(raw?.niveau_requis ?? raw?.niveau ?? 0)
    if (Number.isFinite(direct) && direct >= 1 && direct <= 5) return Math.round(direct)
    const desired = String(raw?.desired_level ?? '').toLowerCase()
    if (desired === 'low') return 2
    if (desired === 'high') return 4
    if (desired === 'expert') return 5
    return 3
  }

  private skillDeltaFromRequiredLevel(level: number): number {
    // Level-aware delta: higher required level => stronger impact.
    // L1=0.20, L2=0.30, L3=0.40, L4=0.50, L5=0.60
    const clamped = Math.max(1, Math.min(5, Number(level) || 3))
    return Number((0.1 + clamped * 0.1).toFixed(2))
  }

  private hasSkillInDataset(requestedSkill: string, availableSkills: string[]): boolean {
    const req = this.normalizeSkillKey(requestedSkill)
    if (!req) return false
    if (availableSkills.includes(req)) return true
    return availableSkills.some((skill) => {
      if (skill.includes(req) || req.includes(skill)) return true
      return this.tokenJaccard(req, skill) >= 0.72
    })
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
    const requiredSkillsFromRec = Array.isArray((rec as any).parsed_activity?.required_skills)
      ? (rec as any).parsed_activity.required_skills
      : []
    const requiredSkillsFromActivity = Array.isArray((activity as any)?.requiredSkills)
      ? (activity as any).requiredSkills.map((s: any) => ({ intitule: s?.skill_name }))
      : []
    const requiredSkills = requiredSkillsFromRec.length > 0 ? requiredSkillsFromRec : requiredSkillsFromActivity

    const latestFiche = await this.ficheModel
      .findOne({ user_id: new Types.ObjectId(employeeId) })
      .sort({ saisons: -1, updatedAt: -1, createdAt: -1 })
      .exec()

    const skillUpdates: any[] = []
    if ((response === 'ACCEPTED' || response === 'DECLINED') && latestFiche && requiredSkills.length > 0) {
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
        // Link progression directly to required skills + level:
        // acceptance increases, decline decreases (bounded to [0, 10]).
        const level = this.requiredLevelToNumber(req)
        const magnitude = this.skillDeltaFromRequiredLevel(level)
        const delta = response === 'ACCEPTED' ? magnitude : -magnitude
        const afterAuto = Math.max(0, Math.min(10, Number((beforeAuto + delta).toFixed(2))))
        const afterManager = Math.max(0, Math.min(10, Number((beforeManager + delta).toFixed(2))))

        comp.auto_eval = afterAuto
        comp.hierarchie_eval = afterManager
        await comp.save()

        skillUpdates.push({
          competence_id: comp._id.toString(),
          intitule: comp.intitule,
          before: { auto_eval: beforeAuto, hierarchie_eval: beforeManager },
          after: { auto_eval: afterAuto, hierarchie_eval: afterManager },
          level_required: level,
          delta_applied: delta,
          source: response === 'ACCEPTED' ? 'activity_acceptance' : 'activity_decline',
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

    if (skillUpdates.length > 0) {
      const direction = response === 'ACCEPTED' ? 'augmenté' : 'diminué'
      const topLines = skillUpdates
        .slice(0, 4)
        .map((s) => `${s.intitule} (niveau ${s.level_required}, ${s.delta_applied > 0 ? '+' : ''}${s.delta_applied})`)
        .join(', ')
      const more = skillUpdates.length > 4 ? ', ...' : ''
      await this.notificationService.create({
        userId: employeeId,
        type: response === 'ACCEPTED' ? NotificationType.EMPLOYEE_ACCEPTED : NotificationType.EMPLOYEE_DECLINED,
        title: 'Mise à jour de vos compétences',
        message: `Suite à votre réponse à l'activité "${activityTitle}", vos scores de compétences ont été ${direction}: ${topLines}${more}.`,
        data: { activityId, response, skill_updates: skillUpdates },
      })
    }
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
    const requestedTopN = this.extractTopNFromPrompt(hrPrompt)
    let employees = await this.getEligibleEmployees(activityDepartment?._id?.toString())
    // Exclude employees who already declined this specific activity,
    // so RH regeneration effectively replaces refused profiles.
    const declinedRows = await this.recommendationModel
      .find({ activityId: new Types.ObjectId(activityId), status: 'EMPLOYEE_DECLINED' })
      .select('userId')
      .exec()
    const declinedEmployeeIds = new Set(
      declinedRows.map((r: any) => String(r?.userId ?? '')).filter((id: string) => id.length > 0),
    )
    if (declinedEmployeeIds.size > 0) {
      employees = employees.filter((e) => !declinedEmployeeIds.has(String(e.id)))
    }
    // If the department scope is too small for requested Top_n, broaden to all active employees.
    if (requestedTopN && employees.length < requestedTopN) {
      const globalEmployees = await this.getEligibleEmployees()
      if (globalEmployees.length > employees.length) {
        employees = globalEmployees.filter((e) => !declinedEmployeeIds.has(String(e.id)))
      }
    }
    if (employees.length === 0) {
      throw new HttpException('No active employees found for recommendation generation', HttpStatus.BAD_REQUEST)
    }

    // Strict guardrail: when the HR prompt explicitly names skills with level
    // (e.g., "React niveau 4"), every requested skill must exist in current data.
    const employeeSkills = employees
      .flatMap((e) => Array.isArray(e.competences) ? e.competences : [])
      .map((c: any) => this.normalizeSkillKey(c?.intitule))
      .filter(Boolean)
    const [catalogCompetences, catalogQuestions] = await Promise.all([
      this.competenceModel.find({}).select('intitule').lean().exec(),
      this.questionCompetenceModel.find({ status: { $in: ['active', 'ACTIVE'] } }).select('intitule').lean().exec(),
    ])
    const availableSkills = Array.from(
      new Set([
        ...employeeSkills,
        ...catalogCompetences.map((c: any) => this.normalizeSkillKey(c?.intitule)).filter(Boolean),
        ...catalogQuestions.map((q: any) => this.normalizeSkillKey(q?.intitule)).filter(Boolean),
      ]),
    )
    const promptRequestedSkills = this.extractRequestedSkillsFromPrompt(hrPrompt)
    const missingPromptSkills = promptRequestedSkills.filter(
      (name) => !this.hasSkillInDataset(name, availableSkills),
    )
    if (missingPromptSkills.length > 0) {
      const preview = missingPromptSkills.slice(0, 8).join(', ')
      const suffix = missingPromptSkills.length > 8 ? ', ...' : ''
      throw new HttpException(
        `Compétence(s) non trouvée(s): ${preview}${suffix}. Vérifiez vos données dans la base.`,
        HttpStatus.BAD_REQUEST,
      )
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

    const recommendationsRaw = Array.isArray(aiData?.recommendations) ? aiData.recommendations : []
    const parsedTopN = Number(aiData?.parsed_activity?.top_n ?? 0)
    const targetTopN = requestedTopN ?? (Number.isFinite(parsedTopN) && parsedTopN > 0 ? Math.max(1, Math.min(500, parsedTopN)) : null)
    let recommendations = targetTopN
      ? [...recommendationsRaw]
          .sort((a: any, b: any) => {
            const rankA = Number(a?.rank ?? Number.MAX_SAFE_INTEGER)
            const rankB = Number(b?.rank ?? Number.MAX_SAFE_INTEGER)
            if (rankA !== rankB) return rankA - rankB
            return Number(b?.score_total ?? 0) - Number(a?.score_total ?? 0)
          })
          .slice(0, targetTopN)
      : recommendationsRaw

    // Safety net: some AI responses return fewer rows than requested Top_n.
    // Complete from remaining eligible employees to respect requested cardinality.
    if (targetTopN) {
      const targetCount = Math.min(targetTopN, employees.length)
      if (recommendations.length < targetCount) {
        const existing = new Set(
          recommendations
            .map((r: any) => String(r?.employee_id ?? ''))
            .filter((id: string) => id.length > 0),
        )
        const missingEmployees = employees.filter((e) => !existing.has(String(e.id)))
        const nextRankStart = recommendations.length + 1
        const filler = missingEmployees.slice(0, targetCount - recommendations.length).map((e, idx) => ({
          employee_id: String(e.id),
          score_total: 0,
          score_nlp: 0,
          score_competences: 0,
          score_progression: 0,
          score_history: 0,
          score_seniority: 0,
          rank: nextRankStart + idx,
          matched_skills: [],
          recommendation_reason:
            'Ajout automatique pour completer Top_n; profil disponible mais non classe par le modele IA dans la reponse initiale.',
        }))
        recommendations = [...recommendations, ...filler]
      }
    }
    const requestedSkills = Array.isArray(aiData?.parsed_activity?.required_skills)
      ? aiData.parsed_activity.required_skills
      : []
    const requestedNames = requestedSkills
      .map((s: any) => String(s?.intitule ?? '').trim())
      .filter(Boolean)
    const isGenericSkillLabel = (name: string) => {
      const key = this.normalizeSkillKey(name)
      return (
        key === 'competence generale' ||
        key === 'general skill' ||
        key === 'competence' ||
        key === 'technical skills' ||
        key === 'soft skills' ||
        key === 'hard skills'
      )
    }
    const parsedSpecificNames = requestedNames.filter((n) => !isGenericSkillLabel(n))
    // If AI parser returns generic placeholders (e.g., "compétence générale"),
    // trust HR prompt extraction instead of blocking on a false missing skill.
    const validationNames =
      parsedSpecificNames.length > 0
        ? Array.from(new Set([...parsedSpecificNames, ...promptRequestedSkills]))
        : promptRequestedSkills
    const missingRequestedSkills = validationNames.filter(
      (name) => !this.hasSkillInDataset(name, availableSkills),
    )
    if (missingRequestedSkills.length > 0) {
      const preview = missingRequestedSkills.slice(0, 8).join(', ')
      const suffix = missingRequestedSkills.length > 8 ? ', ...' : ''
      throw new HttpException(
        `Compétence(s) non trouvée(s): ${preview}${suffix}. Vérifiez vos données de compétences puis réessayez.`,
        HttpStatus.BAD_REQUEST,
      )
    }

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
        status: {
          $in: [
            'HR_APPROVED',
            'MANAGER_APPROVED',
            'MANAGER_REJECTED',
            'NOTIFIED',
            'ACCEPTED',
            'DECLINED',
            'EMPLOYEE_CONFIRMED',
            'EMPLOYEE_DECLINED',
          ],
        },
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
          status: { $in: ['HR_APPROVED', 'PENDING', 'SENT_TO_MANAGER'] },
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
      if (!['HR_APPROVED', 'PENDING', 'SENT_TO_MANAGER'].includes(rec.status)) continue

      rec.status = decision.action === 'approve' ? 'MANAGER_APPROVED' : 'MANAGER_REJECTED'
      rec.manager_note = decision.note
      rec.manager_validated_at = new Date()
      rec.updated_at = new Date()
      await rec.save()

      if (decision.action === 'approve') {
        const employee = await this.userModel.findById(rec.userId).select('_id').exec()
        if (employee) {
          const activityTitle = await this.getActivityTitle(activity)
          const date = (activity as any).date ?? (activity as any).startDate ?? new Date()
          const description = (activity as any).description ?? ''
          await this.notificationService.notifyEmployeeInvitation(
            employee._id.toString(),
            activityId,
            activityTitle,
            date,
            {
              description,
              objectifs: (activity as any).objectifs ?? '',
              location: (activity as any).location ?? '',
              duration: (activity as any).duration ?? '',
              type: (activity as any).type ?? '',
            },
          )
        }
      }

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

    // Note: L'envoi d'email est maintenant manuel via le bouton "Envoyer Email" du manager
    // Le statut reste MANAGER_APPROVED jusqu'à ce que le manager envoie l'email
    const notifiedCount = 0 // Pas d'envoi automatique
    /*
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
    */

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

  async hrAdjustScore(recommendationId: string, hrUserId: string, amount?: number, note?: string) {
    const hr = await this.userModel.findById(this.resolveUserId(hrUserId)).select('_id role').exec()
    if (!hr || !['HR', 'hr'].includes(String(hr.role))) {
      throw new HttpException('Only HR can adjust recommendation scores', HttpStatus.FORBIDDEN)
    }

    const rec = await this.recommendationModel.findById(recommendationId).exec()
    if (!rec) throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)
    if (String(rec.status) !== 'EMPLOYEE_DECLINED') {
      throw new HttpException('Score adjustment is allowed only for employee-declined recommendations', HttpStatus.BAD_REQUEST)
    }

    const delta = Math.max(0.01, Math.min(0.5, Number(amount ?? 0.05)))
    const before = Number(rec.score_total ?? 0)
    const after = Math.max(0, Number((before - delta).toFixed(4)))
    rec.score_total = after
    rec.updated_at = new Date()
    if (note && String(note).trim()) {
      rec.hr_note = `${String(rec.hr_note ?? '').trim()}${rec.hr_note ? ' | ' : ''}Ajustement score: -${delta} (${String(note).trim()})`
    } else {
      rec.hr_note = `${String(rec.hr_note ?? '').trim()}${rec.hr_note ? ' | ' : ''}Ajustement score: -${delta}`
    }
    await rec.save()

    const siblings = await this.recommendationModel
      .find({ activityId: rec.activityId })
      .sort({ score_total: -1, rank: 1, created_at: -1 })
      .exec()
    if (siblings.length > 0) {
      await this.recommendationModel.bulkWrite(
        siblings.map((row, idx) => ({
          updateOne: {
            filter: { _id: row._id },
            update: { $set: { rank: idx + 1 } },
          },
        })),
      )
    }

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'hr_adjust_score',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Recommendation',
      entityId: recommendationId,
      before: { score_total: before },
      after: { score_total: after, amount: delta, note: note ?? '' },
    })

    await this.notificationService.create({
      userId: rec.userId.toString(),
      type: NotificationType.EMPLOYEE_DECLINED,
      title: 'Mise à jour RH sur votre refus',
      message: `Suite à votre motif de refus, RH a diminué votre score de recommandation de ${(delta * 100).toFixed(0)}%.`,
      data: { activityId: rec.activityId.toString(), recommendationId, action: 'decrease_score', amount: delta, note: note ?? '' },
    })

    return { recommendationId, score_before: before, score_after: after, amount: delta }
  }

  async hrKeepScore(recommendationId: string, hrUserId: string, note?: string) {
    const hr = await this.userModel.findById(this.resolveUserId(hrUserId)).select('_id role').exec()
    if (!hr || !['HR', 'hr'].includes(String(hr.role))) {
      throw new HttpException('Only HR can keep recommendation scores', HttpStatus.FORBIDDEN)
    }

    const rec = await this.recommendationModel.findById(recommendationId).exec()
    if (!rec) throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)
    if (String(rec.status) !== 'EMPLOYEE_DECLINED') {
      throw new HttpException('Keep-score action is allowed only for employee-declined recommendations', HttpStatus.BAD_REQUEST)
    }

    rec.updated_at = new Date()
    rec.hr_note = `${String(rec.hr_note ?? '').trim()}${rec.hr_note ? ' | ' : ''}Score conservé${note ? ` (${String(note).trim()})` : ''}`
    await rec.save()

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'hr_keep_score',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Recommendation',
      entityId: recommendationId,
      after: { score_total: Number(rec.score_total ?? 0), note: note ?? '' },
    })

    await this.notificationService.create({
      userId: rec.userId.toString(),
      type: NotificationType.EMPLOYEE_DECLINED,
      title: 'Mise à jour RH sur votre refus',
      message: 'RH a conservé votre score de recommandation après examen de votre motif.',
      data: { activityId: rec.activityId.toString(), recommendationId, action: 'keep_score', note: note ?? '' },
    })

    return { recommendationId, score_kept: Number(rec.score_total ?? 0) }
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
    if (!['NOTIFIED', 'MANAGER_APPROVED'].includes(String(rec.status))) {
      throw new HttpException('Recommendation is not in a confirmable state', HttpStatus.BAD_REQUEST)
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

  async getMySkillUpdates(employeeId: string) {
    const rows = await this.activityHistoryModel
      .find({ userId: new Types.ObjectId(employeeId) })
      .sort({ completed_at: -1 })
      .exec()

    return rows.map((r: any) => ({
      activity_id: r?.activityId?.toString?.() ?? '',
      activity_title: String(r?.activity_title ?? 'Activité'),
      status: String(r?.status ?? ''),
      feedback: String(r?.feedback ?? ''),
      completed_at: r?.completed_at ?? null,
      skill_updates: Array.isArray(r?.skill_updates) ? r.skill_updates : [],
    }))
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

  // ─── Export (PDF / Excel) ────────────────────────────────────────────────

  async exportRecommendations(
    activityId: string,
    format: 'pdf' | 'excel',
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    if (!isValidObjectId(activityId)) {
      throw new HttpException('Invalid activity id', HttpStatus.BAD_REQUEST)
    }

    try {
      const activity = await this.activityModel.findById(activityId).exec()
      if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)

      const recs = await this.recommendationModel
        .find({ activityId: new Types.ObjectId(activityId) })
        .populate('userId', 'name email')
        .sort({ score_total: -1, rank: 1 })
        .exec()

      const activityTitle: string = (activity as any).titre ?? (activity as any).title ?? 'Activite'
      const safeTitle = activityTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 40)
      const headers = ['Employe', 'Score Global', 'Hard Skills']

      const rows = recs.map((rec: any) => {
        const employee: string = rec.userId?.name ?? rec.userId?.email ?? 'N/A'
        const scoreGlobal: string = Number(rec.score_total ?? 0).toFixed(2)
        const hardSkills: string = Array.isArray(rec.matched_skills)
          ? rec.matched_skills
              .map((s: any) => {
                const name = String(s?.intitule ?? s?.skill_name ?? s?.name ?? '')
                const lvl = s?.niveau ?? s?.level ?? s?.score
                return lvl !== undefined ? `${name} (${lvl})` : name
              })
              .filter(Boolean)
              .join(', ')
          : ''
        return [employee, scoreGlobal, hardSkills]
      })

      // ─── PDF ────────────────────────────────────────────────────────────────
      if (format === 'pdf') {
        let jsPDFModule: any
        let autoTableModule: any
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          jsPDFModule = require('jspdf')
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          autoTableModule = require('jspdf-autotable')
        } catch (e: any) {
          throw new HttpException(
            `Librairie PDF indisponible: ${String(e?.message ?? e)}. Installez jspdf et jspdf-autotable.`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }

        const jsPDFClass = jsPDFModule?.jsPDF ?? jsPDFModule?.default?.jsPDF ?? jsPDFModule?.default
        if (!jsPDFClass) {
          throw new HttpException('jsPDF class non trouvée dans le module importé.', HttpStatus.INTERNAL_SERVER_ERROR)
        }

        const autoTable = autoTableModule?.default ?? autoTableModule
        const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        doc.setFontSize(14)
        doc.text(`Recommandations - ${activityTitle}`, 14, 16)
        doc.setFontSize(9)
        doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')}`, 14, 23)

        if (typeof autoTable === 'function') {
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 28,
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 55 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 'auto' },
            },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            margin: { left: 14, right: 14 },
          })
        } else if (typeof (doc as any).autoTable === 'function') {
          ;(doc as any).autoTable({
            head: [headers],
            body: rows,
            startY: 28,
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 55 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 'auto' },
            },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            margin: { left: 14, right: 14 },
          })
        }

        const pdfOutput = doc.output('arraybuffer')
        const buffer = Buffer.from(pdfOutput as ArrayBuffer)
        return { buffer, filename: `recommandations_${safeTitle}.pdf`, mimeType: 'application/pdf' }

      // ─── EXCEL ──────────────────────────────────────────────────────────────
      } else {
        let XLSX_LIB: typeof XLSX
        try {
          XLSX_LIB = XLSX
          // Sanity check that the lib is loaded
          if (typeof XLSX_LIB?.utils?.aoa_to_sheet !== 'function') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            XLSX_LIB = require('xlsx')
          }
        } catch (e: any) {
          throw new HttpException(
            `Librairie xlsx indisponible: ${String(e?.message ?? e)}. Lancez: npm install xlsx`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }

        const ws = XLSX_LIB.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 70 }]
        const wb = XLSX_LIB.utils.book_new()
        XLSX_LIB.utils.book_append_sheet(wb, ws, 'Recommandations')
        const buffer = XLSX_LIB.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
        return {
          buffer,
          filename: `recommandations_${safeTitle}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      }
    } catch (err: any) {
      // Re-throw HttpExceptions as-is, wrap other errors with details
      if (err instanceof HttpException) throw err
      throw new HttpException(
        `Export echoue: ${String(err?.message ?? err)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
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

  /**
   * Envoie un SMS de rappel manuel à un employé recommandé.
   * Appelé par le RH depuis l'interface, un clic par employé.
   */
  async sendSmsReminder(recommendationId: string, hrUserId: string): Promise<{ sent: boolean; message: string }> {
    const hr = await this.userModel.findById(this.resolveUserId(hrUserId)).select('_id role').exec()
    if (!hr || !['HR', 'hr', 'ADMIN', 'admin'].includes(String(hr.role))) {
      throw new HttpException('Only HR can send SMS reminders', HttpStatus.FORBIDDEN)
    }

    const rec = await this.recommendationModel
      .findById(recommendationId)
      .populate('activityId')
      .exec()
    if (!rec) throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)

    const employee = await this.userModel
      .findById(rec.userId)
      .select('name email telephone')
      .exec()
    if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND)

    if (!employee.telephone) {
      return { sent: false, message: `Aucun numéro de téléphone enregistré pour ${employee.name}` }
    }

    const activity = rec.activityId as any
    const activityTitle = activity?.title ?? activity?.titre ?? 'Activité'
    const activityDate = activity?.date ?? activity?.startDate ?? new Date()

    await this.smsService.sendRecommendationReminder({
      to: employee.telephone,
      employeeName: employee.name,
      activityTitle,
      activityDate,
      deadlineDays: 3,
      frontendUrl: process.env.FRONTEND_URL,
    })

    await this.auditService.logAction({
      domain: 'recommendations',
      action: 'sms_reminder_sent',
      actorId: hrUserId,
      actorRole: 'HR',
      entityType: 'Recommendation',
      entityId: recommendationId,
      after: { employee: employee.name, phone: employee.telephone, activityTitle },
    })

    return { sent: true, message: `SMS envoyé à ${employee.name} (${employee.telephone})` }
  }
}

