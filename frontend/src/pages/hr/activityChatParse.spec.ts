import { describe, it, expect } from 'vitest'
import {
  parseActivityFromText,
  generateRecommendations,
  generateManagerMessage,
  parseFieldCompletion,
  type ActivityData,
} from './activityChatParse'

describe('activityChatParse', () => {
  describe('parseActivityFromText', () => {
    it('détecte une formation et le titre après le mot formation', () => {
      const r = parseActivityFromText(
        'Créer une formation React pour 10 développeurs juniors',
      )
      expect(r.activity.type).toBe('training')
      expect(r.activity.maxParticipants).toBe(10)
      expect(r.activity.title?.toLowerCase()).toContain('react')
      expect(r.activity.experienceLevel).toBe('junior')
    })

    it('détecte certification et priorité haute', () => {
      const r = parseActivityFromText(
        'Mission certification AWS pour 5 ingénieurs seniors, urgent',
      )
      expect(r.activity.type).toBe('certification')
      expect(r.activity.maxParticipants).toBe(5)
      expect(r.activity.experienceLevel).toBe('senior')
      expect(r.activity.priority).toBe('high')
    })

    it('extrait une compétence présente dans le texte', () => {
      const r = parseActivityFromText('Formation agile pour 8 personnes')
      expect(r.activity.type).toBe('training')
      expect(r.activity.requiredSkills?.some((s) => s.skill_name.toLowerCase() === 'agile')).toBe(true)
    })
  })

  describe('generateRecommendations', () => {
    it('ajoute une reco pour gros groupe', () => {
      const rec = generateRecommendations({ maxParticipants: 25 })
      expect(rec.some((x) => x.includes('20'))).toBe(true)
    })

    it('ajoute une reco pour formation', () => {
      const rec = generateRecommendations({ type: 'training', maxParticipants: 10 })
      expect(rec.length).toBeGreaterThan(0)
    })
  })

  describe('generateManagerMessage', () => {
    it('produit sujet et corps', () => {
      const activity: ActivityData = {
        title: 'Test',
        description: 'Desc',
        type: 'training',
        location: 'Paris',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        maxParticipants: 10,
        departmentId: 'd1',
        requiredSkills: [{ skill_name: 'React', desired_level: 'high' }],
        objectives: ['O1'],
        experienceLevel: 'mid',
        priority: 'medium',
      }
      const m = generateManagerMessage(activity)
      expect(m.subject).toContain('Test')
      expect(m.content).toContain('React')
    })
  })

  describe('parseFieldCompletion', () => {
    it('parse champ: valeur', () => {
      const p = parseFieldCompletion('ajouter titre : Ma super formation')
      expect(p).not.toBeNull()
      expect(p!.rawField.toLowerCase()).toBe('titre')
      expect(p!.value).toContain('Ma super formation')
    })

    it('retourne null si pas de préfixe attendu', () => {
      expect(parseFieldCompletion('hello world')).toBeNull()
    })
  })
})
