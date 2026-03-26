// ============ USER & AUTH ============
export type UserRole = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE'
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User {
  id: string
  name: string
  matricule: string
  telephone: string
  email: string
  password: string
  date_embauche: string
  departement_id: string
  manager_id: string | null
  status: UserStatus
  en_ligne: boolean
  role: UserRole
  avatar?: string
}

// ============ DEPARTMENT ============
export interface Department {
  id: string
  name: string
  code: string
  description: string
  manager_id: string
  created_at: string
  updated_at: string
}

// ============ SKILLS ============
export type CompetenceType = 'knowledge' | 'know_how' | 'soft_skills'
export type SkillLevel = 'low' | 'medium' | 'high' | 'expert'
export type EvaluationStatus = 'draft' | 'submitted' | 'validated'

export interface QuestionCompetence {
  id: string
  intitule: string
  details: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Competence {
  id: string
  fiches_id: string
  question_competence_id: string
  type: CompetenceType
  intitule: string
  auto_eval: number
  hierarchie_eval: number
  etat: EvaluationStatus
  created_at: string
  updated_at: string
}

export interface Fiche {
  id: string
  user_id: string
  saisons: string
  etat: 'draft' | 'in_progress' | 'completed' | 'validated'
  created_at: string
  updated_at: string
}

// ============ ACTIVITY ============
export type ActivityType = 'training' | 'certification' | 'project' | 'mission' | 'audit'
export type ActivityStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
export type PriorityContext = 'develop_low' | 'consolidate_medium' | 'exploit_expert'

export interface RequiredSkill {
  skill_name: string
  desired_level: SkillLevel
  type?: CompetenceType
  weight?: number
}

export interface Activity {
  id: string
  title: string
  description: string
  type: ActivityType
  required_skills: RequiredSkill[]
  seats: number
  date: string
  // Optionnel côté front, mappé à endDate côté backend si disponible
  end_date?: string
  duration: string
  location: string
  priority: PriorityContext
  status: ActivityStatus
  created_by: string
  assigned_manager?: string
  created_at: string
  updated_at: string
}

// ============ RECOMMENDATION ============
export interface SkillMatch {
  skill_name: string
  employee_score: number
  required_score: number
  match_percentage: number
}

export interface Recommendation {
  id: string
  activity_id: string
  employee_id: string
  employee_name: string
  employee_department: string
  global_score: number
  skills_match: SkillMatch[]
  match_percentage: number
  experience_score: number
  progression_score: number
  priority_fit: string
  justification: string
  status: 'recommended' | 'confirmed' | 'rejected' | 'accepted' | 'declined'
  decline_reason?: string
}

// ============ NOTIFICATIONS ============
export type NotificationType = 'activity_assigned' | 'recommendation' | 'participation_confirmed' | 'activity_created' | 'general'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  activity_id?: string
  created_at: string
}

// ============ ANALYTICS ============
export interface DepartmentSkillStats {
  department: string
  knowledge: number
  know_how: number
  soft_skills: number
}

export interface SkillGap {
  skill: string
  current: number
  required: number
  gap: number
}

export interface ProgressionData {
  month: string
  score: number
}
