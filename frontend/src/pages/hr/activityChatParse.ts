import type { RequiredSkill } from '../../types'

export type ActivityData = {
  title: string
  description: string
  type: 'training' | 'project' | 'mission' | 'certification'
  location: string
  startDate: string
  endDate: string
  maxParticipants: number
  departmentId: string
  requiredSkills: RequiredSkill[]
  objectives: string[]
  experienceLevel: 'junior' | 'mid' | 'senior'
  priority: 'low' | 'medium' | 'high'
}

export interface ParsedActivity {
  activity: Partial<ActivityData>
  missingFields: string[]
  confidence: number
}

export interface ManagerMessage {
  subject: string
  content: string
}

/** Extraction titre sans regex à risque de backtracking (Sonar security hotspots). */
function extractActivityTitle(text: string): string | undefined {
  const lower = text.toLowerCase()
  const anchors = ['formation', 'projet', 'mission', 'certification', 'activité']
  const stopNeedles = [' pour ', ' avec ', ' durant ', ' pendant ', ' le ', ' la ', ' les ', ' en ']

  for (const anchor of anchors) {
    const idx = lower.indexOf(anchor)
    if (idx < 0) continue

    let segment = text.slice(idx + anchor.length).trim()
    segment = segment.replace(/^(sur|en|de)\s+/i, '').trim()
    if (!segment) continue

    let cut = segment.length
    const segLower = segment.toLowerCase()
    for (const sw of stopNeedles) {
      const si = segLower.indexOf(sw)
      if (si >= 0 && si < cut) cut = si
    }

    const title = segment.slice(0, cut).trim()
    if (title.length > 0 && title.length <= 240) return title
  }

  return undefined
}

/** Participants : motif borné (\d{1,4}) pour éviter DoS regex. */
function extractMaxParticipants(text: string): number | undefined {
  const m = text.match(
    /\b(\d{1,4})\s*(?:participants?|personnes?|employés?|managers?|personnel|développeurs?|developpeurs?|ingénieurs?|ingenieurs?|devs?)\b/i,
  )
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : undefined
}

export function parseActivityFromText(text: string): ParsedActivity {
  const lowerText = text.toLowerCase()

  const activity: Partial<ActivityData> = {}
  const missingFields: string[] = []

  if (lowerText.includes('formation') || lowerText.includes('training')) {
    activity.type = 'training'
  } else if (lowerText.includes('projet') || lowerText.includes('project')) {
    activity.type = 'project'
  } else if (lowerText.includes('certification')) {
    activity.type = 'certification'
  } else if (lowerText.includes('mission')) {
    activity.type = 'mission'
  }

  const title = extractActivityTitle(text)
  if (title) activity.title = title

  const maxP = extractMaxParticipants(text)
  if (maxP !== undefined) activity.maxParticipants = maxP

  if (lowerText.includes('junior') || lowerText.includes('débutant')) {
    activity.experienceLevel = 'junior'
  } else if (lowerText.includes('senior') || lowerText.includes('confirmé') || lowerText.includes('expert')) {
    activity.experienceLevel = 'senior'
  } else if (lowerText.includes('mid') || lowerText.includes('intermédiaire')) {
    activity.experienceLevel = 'mid'
  }

  if (lowerText.includes('urgent') || lowerText.includes('priorité haute')) {
    activity.priority = 'high'
  } else if (lowerText.includes('important')) {
    activity.priority = 'medium'
  }

  const skills: RequiredSkill[] = []
  const skillKeywords = [
    'leadership',
    'management',
    'communication',
    'react',
    'javascript',
    'python',
    'java',
    'cybersécurité',
    'data',
    'analyse',
    'marketing',
    'vente',
    'négociation',
    'gestion',
    'projet',
    'agile',
    'scrum',
    'design',
    'ux',
    'ui',
  ]

  skillKeywords.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      skills.push({
        skill_name: skill.charAt(0).toUpperCase() + skill.slice(1),
        desired_level:
          activity.experienceLevel === 'senior'
            ? 'expert'
            : activity.experienceLevel === 'mid'
              ? 'high'
              : 'medium',
      })
    }
  })

  if (skills.length > 0) {
    activity.requiredSkills = skills
  }

  if (!activity.title) missingFields.push('title')
  if (!activity.description) missingFields.push('description')
  if (!activity.type) missingFields.push('type')
  if (!activity.maxParticipants) missingFields.push('maxParticipants')
  if (!activity.startDate) missingFields.push('startDate')
  if (!activity.endDate) missingFields.push('endDate')
  if (!activity.departmentId) missingFields.push('departmentId')
  if (!activity.location) missingFields.push('location')
  if (!activity.requiredSkills || activity.requiredSkills.length === 0) missingFields.push('requiredSkills')

  const totalFields = 9
  const filledFields = totalFields - missingFields.length
  const confidence = filledFields / totalFields

  return { activity, missingFields, confidence }
}

export function generateRecommendations(activity: Partial<ActivityData>): string[] {
  const recommendations: string[] = []

  if (activity.maxParticipants && activity.maxParticipants > 20) {
    recommendations.push(
      'Avec plus de 20 participants, envisagez de diviser en groupes pour une meilleure interaction',
    )
  }

  if (activity.maxParticipants && activity.maxParticipants < 5) {
    recommendations.push(
      'Un petit groupe permet des sessions personnalisées - prévoyez du temps pour les Q&A',
    )
  }

  if (activity.type === 'training') {
    recommendations.push("Prévoyez une évaluation pré/post formation pour mesurer l'impact")
    recommendations.push('Planifiez à mi-semaine pour maximiser la participation')
  }

  if (activity.experienceLevel === 'senior') {
    recommendations.push('Pour un public senior, privilégiez des études de cas et du peer-learning')
  }

  return recommendations
}

export function generateManagerMessage(activity: ActivityData): ManagerMessage {
  const typeLabels: Record<string, string> = {
    training: 'Formation',
    project: 'Projet',
    mission: 'Mission',
    certification: 'Certification',
  }

  const subject = `Validation demandée: ${typeLabels[activity.type] || 'Activité'} - ${activity.title}`

  const skillsText = activity.requiredSkills?.map((s) => s.skill_name).join(', ') || 'À définir'
  const experienceLabel =
    activity.experienceLevel === 'junior'
      ? 'Junior'
      : activity.experienceLevel === 'senior'
        ? 'Senior'
        : 'Intermédiaire'

  const content = `Bonjour,\n\nNous avons préparé une ${typeLabels[activity.type]?.toLowerCase() || 'activité'} pour votre validation.\n\n**DÉTAILS DE L'ACTIVITÉ**\n• Titre: ${activity.title}\n• Type: ${typeLabels[activity.type] || activity.type}\n• Description: ${activity.description}\n• Date: ${activity.startDate ? new Date(activity.startDate).toLocaleDateString('fr-FR') : 'À définir'} au ${activity.endDate ? new Date(activity.endDate).toLocaleDateString('fr-FR') : 'À définir'}\n• Lieu: ${activity.location || 'À définir'}\n• Participants max: ${activity.maxParticipants || 'À définir'}\n• Niveau visé: ${experienceLabel}\n• Priorité: ${activity.priority === 'high' ? 'Haute' : activity.priority === 'medium' ? 'Moyenne' : 'Basse'}\n\n**COMPÉTENCES REQUISES**\n${skillsText}\n\n**OBJECTIFS**\n${activity.objectives?.join('\n') || '• Développer les compétences identifiées'}\n\nCette activité est en ligne avec nos objectifs de développement. Merci de la valider.\n\nCordialement,\nService RH`

  return { subject, content }
}

const FIELD_PREFIXES = ['ajoute', 'ajouter', 'complète', 'compléter', 'modifier', 'changer'] as const

/**
 * Parse "ajouter titre : Ma formation" sans regex à fort risque de backtracking.
 */
export function parseFieldCompletion(userText: string): { rawField: string; value: string } | null {
  const trimmed = userText.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  let rest: string | null = null
  for (const p of FIELD_PREFIXES) {
    if (lower === p) return null
    if (lower.startsWith(p + ' ')) {
      rest = trimmed.slice(p.length).trim()
      break
    }
  }
  if (rest === null) return null

  rest = rest.replace(/^(la|le)\s+/i, '').trim()

  let sep = -1
  let sepLen = 0
  const colon = rest.indexOf(':')
  const eq = rest.indexOf('=')
  const estIdx = rest.toLowerCase().indexOf(' est ')

  if (colon >= 0 && (sep < 0 || colon < sep)) {
    sep = colon
    sepLen = 1
  }
  if (eq >= 0 && (sep < 0 || eq < sep)) {
    sep = eq
    sepLen = 1
  }
  if (estIdx >= 0 && (sep < 0 || estIdx < sep)) {
    sep = estIdx
    sepLen = 5
  }

  if (sep < 0 || sep > 80) return null

  const rawField = rest.slice(0, sep).trim()
  const value = rest.slice(sep + sepLen).trim()
  if (!rawField || !value || value.length > 4000) return null

  return { rawField, value }
}
