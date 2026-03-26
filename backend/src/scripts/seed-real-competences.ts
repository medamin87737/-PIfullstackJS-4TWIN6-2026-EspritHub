import 'reflect-metadata'
import mongoose, { Types } from 'mongoose'

import { User, UserSchema } from '../users/schemas/user.schema'
import { Department, DepartmentSchema } from '../users/schemas/department.schema'
import { Fiche, FicheSchema } from '../users/schemas/fiche.schema'
import { Competence, CompetenceSchema } from '../users/schemas/competence.schema'
import { QuestionCompetence, QuestionCompetenceSchema } from '../users/schemas/question-competence.schema'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-recommendation-system'

type SkillTemplate = {
  intitule: string
  type: 'knowledge' | 'know_how' | 'soft_skills'
}

const QUESTION_BANK = [
  { intitule: 'Technical Skills', details: 'Compétences techniques et outils du métier', status: 'active' },
  { intitule: 'Hard Skills', details: 'Compétences métiers mesurables', status: 'active' },
  { intitule: 'Soft Skills', details: 'Compétences comportementales et relationnelles', status: 'active' },
  { intitule: 'Managerial Skills', details: 'Compétences de pilotage et leadership', status: 'active' },
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
  { intitule: 'CI CD DevOps', type: 'knowledge' },
  { intitule: 'Docker Kubernetes', type: 'know_how' },
  { intitule: 'API REST Microservices', type: 'know_how' },
  { intitule: 'Cloud AWS Azure', type: 'knowledge' },
  { intitule: 'Securite applicative', type: 'knowledge' },
  { intitule: 'Tests automatises', type: 'know_how' },
  { intitule: 'Observabilite monitoring', type: 'knowledge' },
]

const HR_SKILLS: SkillTemplate[] = [
  { intitule: 'Recrutement et sourcing', type: 'know_how' },
  { intitule: 'Conduite d entretien', type: 'know_how' },
  { intitule: 'Droit du travail', type: 'knowledge' },
  { intitule: 'Gestion des talents', type: 'knowledge' },
  { intitule: 'Onboarding employes', type: 'know_how' },
  { intitule: 'Evaluation annuelle', type: 'know_how' },
  { intitule: 'Plan de formation', type: 'know_how' },
  { intitule: 'Gestion des conflits', type: 'soft_skills' },
  { intitule: 'Marque employeur', type: 'knowledge' },
  { intitule: 'People analytics', type: 'knowledge' },
]

const BUSINESS_SKILLS: SkillTemplate[] = [
  { intitule: 'Analyse de donnees', type: 'know_how' },
  { intitule: 'Gestion de projet', type: 'know_how' },
  { intitule: 'Reporting KPI', type: 'knowledge' },
  { intitule: 'Conformite et qualite', type: 'knowledge' },
  { intitule: 'Lean management', type: 'know_how' },
  { intitule: 'Finance operationnelle', type: 'knowledge' },
  { intitule: 'Communication client', type: 'soft_skills' },
  { intitule: 'Negociation', type: 'soft_skills' },
  { intitule: 'Risk management', type: 'knowledge' },
  { intitule: 'Business process design', type: 'know_how' },
]

function seedHash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function seededScore(seed: string, min: number, max: number): number {
  const h = seedHash(seed)
  const span = max - min + 1
  return min + (h % span)
}

function questionLabelForSkillType(type: SkillTemplate['type']): string {
  if (type === 'soft_skills') return 'Soft Skills'
  if (type === 'knowledge') return 'Hard Skills'
  return 'Technical Skills'
}

async function ensureQuestionBank(QuestionModel: mongoose.Model<QuestionCompetence>) {
  const idByLabel = new Map<string, Types.ObjectId>()
  for (const q of QUESTION_BANK) {
    const row = await QuestionModel.findOneAndUpdate(
      { intitule: q.intitule },
      { $setOnInsert: q },
      { upsert: true, new: true },
    )
    idByLabel.set(q.intitule, row._id as Types.ObjectId)
  }
  return idByLabel
}

async function main() {
  await mongoose.connect(MONGODB_URI)

  const UserModel = mongoose.model<User>('User', UserSchema)
  const DepartmentModel = mongoose.model<Department>('Department', DepartmentSchema)
  const FicheModel = mongoose.model<Fiche>('Fiche', FicheSchema)
  const CompetenceModel = mongoose.model<Competence>('Competence', CompetenceSchema)
  const QuestionModel = mongoose.model<QuestionCompetence>('QuestionCompetence', QuestionCompetenceSchema)

  const questionIdByLabel = await ensureQuestionBank(QuestionModel)

  const departments = await DepartmentModel.find({}).select('_id code name').exec()
  const deptById = new Map<string, { code: string; name: string }>()
  departments.forEach((d: any) => {
    deptById.set(String(d._id), { code: String(d.code ?? ''), name: String(d.name ?? '') })
  })

  const targetUsers = await UserModel.find({
    role: { $in: [/^employee$/i, /^manager$/i, /^hr$/i] },
  })
    .select('_id name role department_id')
    .exec()

  if (targetUsers.length === 0) {
    console.log('Aucun utilisateur actif (EMPLOYEE/MANAGER/HR) trouvé. Rien à semer.')
    await mongoose.connection.close()
    return
  }

  const currentYear = new Date().getFullYear().toString()
  const previousYear = String(Number(currentYear) - 1)

  let createdFiches = 0
  let createdCompetences = 0
  let updatedCompetences = 0

  for (const user of targetUsers as any[]) {
    const userId = String(user._id)
    const role = String(user.role ?? 'EMPLOYEE').toUpperCase()
    const dept = deptById.get(String(user.department_id ?? ''))
    const deptCode = String(dept?.code ?? '').toUpperCase()

    const roleBoost = role === 'MANAGER' ? 1 : role === 'HR' ? 0 : -1

    const deptSkills =
      deptCode.includes('RH') || deptCode.includes('HR')
        ? HR_SKILLS
        : deptCode.includes('DT') || deptCode.includes('IT') || deptCode.includes('TECH')
          ? TECH_SKILLS
          : BUSINESS_SKILLS

    const skillSet = [...COMMON_SKILLS, ...deptSkills]

    let fiche = await FicheModel.findOne({
      user_id: new Types.ObjectId(userId),
      saisons: currentYear,
    }).exec()

    if (!fiche) {
      fiche = await FicheModel.create({
        user_id: new Types.ObjectId(userId),
        saisons: currentYear,
        etat: 'validated',
      })
      createdFiches += 1
    }

    // Keep one historical fiche to support progression visuals/history in real DB.
    const oldFiche = await FicheModel.findOne({
      user_id: new Types.ObjectId(userId),
      saisons: previousYear,
    }).exec()
    if (!oldFiche) {
      await FicheModel.create({
        user_id: new Types.ObjectId(userId),
        saisons: previousYear,
        etat: 'completed',
      })
      createdFiches += 1
    }

    for (const s of skillSet) {
      const questionLabel = questionLabelForSkillType(s.type)
      const qId = questionIdByLabel.get(questionLabel)
      if (!qId) continue

      const base = seededScore(`${userId}:${s.intitule}:base`, 3, 8)
      const autoEval = Math.max(1, Math.min(10, base + roleBoost))
      const managerEval = Math.max(1, Math.min(10, autoEval + seededScore(`${userId}:${s.intitule}:delta`, -1, 1)))

      const existing = await CompetenceModel.findOne({
        fiches_id: fiche._id,
        intitule: s.intitule,
      }).exec()

      if (!existing) {
        await CompetenceModel.create({
          fiches_id: fiche._id,
          question_competence_id: qId,
          type: s.type,
          intitule: s.intitule,
          auto_eval: autoEval,
          hierarchie_eval: managerEval,
          etat: 'validated',
        })
        createdCompetences += 1
      } else {
        existing.question_competence_id = qId
        existing.type = s.type
        existing.auto_eval = autoEval
        existing.hierarchie_eval = managerEval
        existing.etat = 'validated'
        await existing.save()
        updatedCompetences += 1
      }
    }
  }

  const totalQuestions = await QuestionModel.countDocuments()
  const totalFiches = await FicheModel.countDocuments()
  const totalCompetences = await CompetenceModel.countDocuments()

  console.log('✅ Seed compétences réelles terminé')
  console.log(`- Questions compétences: ${totalQuestions}`)
  console.log(`- Fiches: ${totalFiches} (créées maintenant: ${createdFiches})`)
  console.log(`- Compétences: ${totalCompetences} (créées: ${createdCompetences}, mises à jour: ${updatedCompetences})`)

  await mongoose.connection.close()
}

main().catch(async (err) => {
  console.error('❌ Erreur seed compétences:', err)
  await mongoose.connection.close()
  process.exit(1)
})

