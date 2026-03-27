import 'reflect-metadata'
import mongoose, { Types } from 'mongoose'
import * as bcrypt from 'bcrypt'

import { User, UserRole, UserSchema, UserStatus } from '../users/schemas/user.schema'
import { Department, DepartmentSchema } from '../users/schemas/department.schema'
import { Fiche, FicheSchema } from '../users/schemas/fiche.schema'
import { Competence, CompetenceSchema } from '../users/schemas/competence.schema'
import { QuestionCompetence, QuestionCompetenceSchema } from '../users/schemas/question-competence.schema'
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema'
import { Recommendation, RecommendationSchema } from '../recommendations/schemas/recommendation.schema'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-recommendation-system'
const PASSWORD = process.env.SEED_PASSWORD || 'Amin@2002'
const EMPLOYEE_COUNT = Number(process.env.SEED_EMPLOYEES || 200)
const MANAGER_COUNT = Number(process.env.SEED_MANAGERS || 8)
const ACTIVITY_COUNT = Number(process.env.SEED_ACTIVITIES || 80)

type SkillTemplate = {
  intitule: string
  type: 'knowledge' | 'know_how' | 'soft_skills'
}

const QUESTION_BANK = [
  { intitule: 'Technical Skills', details: 'Competences techniques et outils du metier', status: 'active' },
  { intitule: 'Hard Skills', details: 'Competences metiers mesurables', status: 'active' },
  { intitule: 'Soft Skills', details: 'Competences comportementales et relationnelles', status: 'active' },
  { intitule: 'Managerial Skills', details: 'Competences de pilotage et leadership', status: 'active' },
]

const COMMON_SKILLS: SkillTemplate[] = [
  { intitule: 'Communication professionnelle', type: 'soft_skills' },
  { intitule: 'Travail en equipe', type: 'soft_skills' },
  { intitule: 'Gestion du temps', type: 'soft_skills' },
  { intitule: 'Resolution de problemes', type: 'know_how' },
]

const TECH_SKILLS: SkillTemplate[] = [
  { intitule: 'JavaScript TypeScript', type: 'know_how' },
  { intitule: 'Node.js NestJS', type: 'know_how' },
  { intitule: 'MongoDB', type: 'knowledge' },
  { intitule: 'Docker Kubernetes', type: 'know_how' },
  { intitule: 'API REST Microservices', type: 'know_how' },
  { intitule: 'Securite applicative', type: 'knowledge' },
  { intitule: 'Tests automatises', type: 'know_how' },
]

const HR_SKILLS: SkillTemplate[] = [
  { intitule: 'Recrutement et sourcing', type: 'know_how' },
  { intitule: 'Conduite d entretien', type: 'know_how' },
  { intitule: 'Droit du travail', type: 'knowledge' },
  { intitule: 'Gestion des talents', type: 'knowledge' },
  { intitule: 'Onboarding employes', type: 'know_how' },
  { intitule: 'Evaluation annuelle', type: 'know_how' },
  { intitule: 'People analytics', type: 'knowledge' },
]

const BUSINESS_SKILLS: SkillTemplate[] = [
  { intitule: 'Analyse de donnees', type: 'know_how' },
  { intitule: 'Gestion de projet', type: 'know_how' },
  { intitule: 'Reporting KPI', type: 'knowledge' },
  { intitule: 'Conformite et qualite', type: 'knowledge' },
  { intitule: 'Negociation', type: 'soft_skills' },
  { intitule: 'Risk management', type: 'knowledge' },
  { intitule: 'Business process design', type: 'know_how' },
]

const DEPARTMENTS = [
  { code: 'RH', name: 'Ressources Humaines', description: 'Gestion RH et talents' },
  { code: 'DT', name: 'Direction Technique', description: 'Ingenierie et systemes' },
  { code: 'FN', name: 'Finance', description: 'Pilotage budgetaire et financier' },
  { code: 'OP', name: 'Operations', description: 'Execution operationnelle' },
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return h
}

function seededRange(seed: string, min: number, max: number): number {
  const n = hashSeed(seed)
  return min + (n % (max - min + 1))
}

function chooseSkillsByDept(code: string): SkillTemplate[] {
  if (code === 'RH') return [...COMMON_SKILLS, ...HR_SKILLS]
  if (code === 'DT') return [...COMMON_SKILLS, ...TECH_SKILLS]
  return [...COMMON_SKILLS, ...BUSINESS_SKILLS]
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  await mongoose.connection.dropDatabase()

  const UserModel = mongoose.model<User>('User', UserSchema)
  const DepartmentModel = mongoose.model<Department>('Department', DepartmentSchema)
  const FicheModel = mongoose.model<Fiche>('Fiche', FicheSchema)
  const CompetenceModel = mongoose.model<Competence>('Competence', CompetenceSchema)
  const QuestionModel = mongoose.model<QuestionCompetence>('QuestionCompetence', QuestionCompetenceSchema)
  const ActivityModel = mongoose.model<Activity>('Activity', ActivitySchema)
  const RecommendationModel = mongoose.model<Recommendation>('Recommendation', RecommendationSchema)

  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const currentYear = new Date().getFullYear().toString()
  const previousYear = String(Number(currentYear) - 1)

  const departments = await DepartmentModel.insertMany(DEPARTMENTS)
  const deptByCode = new Map(departments.map((d: any) => [String(d.code), d]))

  const questionDocs = await QuestionModel.insertMany(QUESTION_BANK)
  const qByName = new Map(questionDocs.map((q: any) => [String(q.intitule), q._id as Types.ObjectId]))
  const qTech = qByName.get('Technical Skills') as Types.ObjectId
  const qHard = qByName.get('Hard Skills') as Types.ObjectId
  const qSoft = qByName.get('Soft Skills') as Types.ObjectId

  const managerDocs = await UserModel.insertMany(
    Array.from({ length: Math.max(2, MANAGER_COUNT) }).map((_, i) => {
      const dept = departments[i % departments.length]
      return {
        name: `Manager ${i + 1}`,
        matricule: `MN-${String(9000 + i).padStart(4, '0')}`,
        telephone: `+216 55 ${String(100000 + i).slice(-6)}`,
        email: i === 0 ? 'manager@rh.com' : `manager${i + 1}@skillup.local`,
        password: passwordHash,
        date_embauche: new Date(`2021-${String((i % 9) + 1).padStart(2, '0')}-15`),
        department_id: dept._id,
        status: UserStatus.ACTIVE,
        role: UserRole.MANAGER,
        en_ligne: false,
      }
    }),
  )

  const hrUser = await UserModel.create({
    name: 'Responsable RH Principal',
    matricule: 'HR-9001',
    telephone: '+216 55 900 001',
    email: 'rh@rh.com',
    password: passwordHash,
    date_embauche: new Date('2022-01-10'),
    department_id: deptByCode.get('RH')._id,
    manager_id: managerDocs[0]._id,
    status: UserStatus.ACTIVE,
    role: UserRole.HR,
    en_ligne: false,
  })

  const adminUser = await UserModel.create({
    name: 'Admin Principal',
    matricule: 'AD-9000',
    telephone: '+216 55 900 000',
    email: 'admin@skillup.local',
    password: passwordHash,
    date_embauche: new Date('2020-01-05'),
    department_id: deptByCode.get('DT')._id,
    manager_id: managerDocs[0]._id,
    status: UserStatus.ACTIVE,
    role: UserRole.ADMIN,
    en_ligne: false,
  })

  await Promise.all(
    departments.map((d: any, i: number) =>
      DepartmentModel.updateOne({ _id: d._id }, { $set: { manager_id: String(managerDocs[i % managerDocs.length]._id) } }),
    ),
  )

  const firstNames = ['Amin', 'Sarra', 'Youssef', 'Meriem', 'Ahmed', 'Ines', 'Karim', 'Nour', 'Salma', 'Walid']
  const lastNames = ['BenAli', 'Trabelsi', 'Jaziri', 'Khalfallah', 'Ayari', 'Mansouri', 'Gharbi', 'Chebbi', 'Mezghani', 'Brahmi']
  const employeesPayload = Array.from({ length: Math.max(50, EMPLOYEE_COUNT) }).map((_, i) => {
    const dept = departments[i % departments.length]
    const manager = managerDocs[i % managerDocs.length]
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[(i * 3) % lastNames.length]
    return {
      name: `${fn} ${ln} ${i + 1}`,
      matricule: `EM-${String(10000 + i).padStart(5, '0')}`,
      telephone: `+216 20 ${String(100000 + i).slice(-6)}`,
      email: `employee${i + 1}@skillup.local`,
      password: passwordHash,
      date_embauche: new Date(`${2021 + (i % 4)}-${String((i % 12) + 1).padStart(2, '0')}-10`),
      department_id: dept._id,
      manager_id: manager._id,
      status: UserStatus.ACTIVE,
      role: UserRole.EMPLOYEE,
      en_ligne: false,
    }
  })
  const employeeDocs = await UserModel.insertMany(employeesPayload)

  const allUsers = [adminUser, hrUser, ...managerDocs, ...employeeDocs]
  const fichePayload: Array<{ _id: Types.ObjectId; user_id: Types.ObjectId; saisons: string; etat: string }> = []
  allUsers.forEach((u: any) => {
    fichePayload.push({ _id: new Types.ObjectId(), user_id: u._id, saisons: currentYear, etat: 'validated' })
    fichePayload.push({ _id: new Types.ObjectId(), user_id: u._id, saisons: previousYear, etat: 'completed' })
  })
  const fiches = await FicheModel.insertMany(fichePayload)

  const currentFicheByUser = new Map<string, Types.ObjectId>()
  fiches.forEach((f: any) => {
    if (String(f.saisons) === currentYear) currentFicheByUser.set(String(f.user_id), f._id as Types.ObjectId)
  })

  const competencePayload: Array<{
    fiches_id: Types.ObjectId
    question_competence_id: Types.ObjectId
    type: string
    intitule: string
    auto_eval: number
    hierarchie_eval: number
    etat: string
  }> = []

  allUsers.forEach((u: any) => {
    const dept = departments.find((d: any) => String(d._id) === String(u.department_id))
    const skillSet = chooseSkillsByDept(String(dept?.code || 'OP'))
    const ficheId = currentFicheByUser.get(String(u._id))
    if (!ficheId) return

    const roleBoost = String(u.role) === 'MANAGER' ? 1 : String(u.role) === 'HR' ? 1 : 0
    for (const s of skillSet) {
      const qId = s.type === 'soft_skills' ? qSoft : s.type === 'knowledge' ? qHard : qTech
      const base = seededRange(`${u._id}:${s.intitule}`, 3, 8)
      const auto = Math.max(1, Math.min(10, base + roleBoost))
      const hier = Math.max(1, Math.min(10, auto + seededRange(`${u._id}:delta:${s.intitule}`, -1, 1)))
      competencePayload.push({
        fiches_id: ficheId,
        question_competence_id: qId,
        type: s.type,
        intitule: s.intitule,
        auto_eval: auto,
        hierarchie_eval: hier,
        etat: 'validated',
      })
    }
  })
  await CompetenceModel.insertMany(competencePayload)

  const activityTitles = ['Leadership', 'Data Analytics', 'NestJS Advanced', 'Recruitment Excellence', 'Project Delivery', 'DevOps Foundations']
  const activitiesPayload = Array.from({ length: Math.max(20, ACTIVITY_COUNT) }).map((_, i) => {
    const dept = departments[i % departments.length]
    return {
      title: `${activityTitles[i % activityTitles.length]} ${i + 1}`,
      description: 'Programme de formation cible pour progression des competences.',
      type: i % 3 === 0 ? 'training' : i % 3 === 1 ? 'workshop' : 'coaching',
      departmentId: String(dept._id),
      created_by: 'HR',
      requiredSkills: chooseSkillsByDept(String(dept.code)).slice(0, 3).map((s) => ({
        skill_name: s.intitule,
        desired_level: seededRange(`lvl:${i}:${s.intitule}`, 5, 8) >= 7 ? 'high' : 'medium',
      })),
      maxParticipants: seededRange(`seats:${i}`, 15, 40),
      location: 'Tunis',
      duration: `${seededRange(`dur:${i}`, 1, 5)} days`,
      startDate: new Date(Date.now() + seededRange(`start:${i}`, 5, 60) * 86400000),
      endDate: new Date(Date.now() + seededRange(`end:${i}`, 61, 120) * 86400000),
      status: 'open',
    }
  })
  const activities = await ActivityModel.insertMany(activitiesPayload)

  const recommendationsPayload: Array<any> = []
  activities.forEach((a: any, ai: number) => {
    const picks = employeeDocs.slice((ai * 7) % employeeDocs.length, ((ai * 7) % employeeDocs.length) + 12)
    picks.forEach((u: any, idx: number) => {
      const scoreTotal = seededRange(`score:${a._id}:${u._id}`, 65, 98)
      recommendationsPayload.push({
        userId: u._id,
        activityId: a._id,
        score_total: scoreTotal,
        score_nlp: Math.max(40, scoreTotal - seededRange(`nlp:${u._id}`, 3, 15)),
        score_competences: Math.max(40, scoreTotal - seededRange(`comp:${u._id}`, 2, 12)),
        score_progression: seededRange(`prog:${u._id}`, 20, 90),
        score_history: seededRange(`hist:${u._id}`, 20, 90),
        score_seniority: seededRange(`sen:${u._id}`, 20, 90),
        rank: idx + 1,
        status: idx % 4 === 0 ? 'MANAGER_APPROVED' : 'PENDING',
        parsed_activity: { title: a.title, type: a.type },
        matched_skills: a.requiredSkills,
        recommendation_reason: 'Matching basee sur competences, historique et progression.',
        created_at: new Date(),
        updated_at: new Date(),
      })
    })
  })
  await RecommendationModel.insertMany(recommendationsPayload)

  console.log('✅ Base recreee et peuplee avec succes')
  console.log(`- Utilisateurs: ${await UserModel.countDocuments()}`)
  console.log(`  - RH: rh@rh.com / ${PASSWORD}`)
  console.log(`  - MANAGER: manager@rh.com / ${PASSWORD}`)
  console.log(`- Departements: ${await DepartmentModel.countDocuments()}`)
  console.log(`- Fiches: ${await FicheModel.countDocuments()}`)
  console.log(`- Competences: ${await CompetenceModel.countDocuments()}`)
  console.log(`- Activites: ${await ActivityModel.countDocuments()}`)
  console.log(`- Recommendations: ${await RecommendationModel.countDocuments()}`)

  await mongoose.connection.close()
}

main().catch(async (err) => {
  console.error('❌ Echec reset/seed:', err)
  await mongoose.connection.close()
  process.exit(1)
})

