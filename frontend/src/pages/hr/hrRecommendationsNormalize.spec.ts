import { describe, expect, it } from 'vitest'
import {
  extractMissingSkillsFromError,
  extractPromptSkillCandidates,
  extractTopNFromPrompt,
  formatScorePercent,
  normalizeParsedActivity,
  normalizeScore,
  normalizeSkillKey,
} from './hrRecommendationsNormalize'

describe('hrRecommendationsNormalize', () => {
  it('normalizeParsedActivity maps legacy keys and skills', () => {
    expect(normalizeParsedActivity(null)).toBeNull()
    expect(normalizeParsedActivity({})).toEqual({
      titre: '',
      description: '',
      contexte: '',
      required_skills: [],
      top_n: 0,
    })
    const parsed = normalizeParsedActivity({
      title: 'T',
      description: 'D',
      contexte: 'C',
      required_skills: [{ skill_name: 'SQL', niveau_requis: 2, poids: 1 }],
      top_n: 5,
    })
    expect(parsed?.titre).toBe('T')
    expect(parsed?.required_skills[0]?.intitule).toBe('SQL')
    expect(parsed?.top_n).toBe(5)
  })

  it('normalizeScore clamps and divides percent-style values', () => {
    expect(normalizeScore(undefined)).toBe(0)
    expect(normalizeScore('nan')).toBe(0)
    expect(normalizeScore(-3)).toBe(0)
    expect(normalizeScore(0.42)).toBe(0.42)
    expect(normalizeScore(42)).toBe(0.42)
    expect(normalizeScore(150)).toBe(1.5)
  })

  it('formatScorePercent mirrors normalizeScore', () => {
    expect(formatScorePercent(0.51234)).toBe('51.2%')
    expect(formatScorePercent(67)).toBe('67.0%')
  })

  it('normalizeSkillKey strips accents and collapses spaces', () => {
    expect(normalizeSkillKey('  Café Noir  ')).toBe('cafe noir')
  })

  it('extractMissingSkillsFromError parses competence lists', () => {
    expect(extractMissingSkillsFromError('')).toEqual([])
    expect(
      extractMissingSkillsFromError('Compétence(s) non trouvée(s) : Foo; Bar vérifiez les données.'),
    ).toEqual(['Foo', 'Bar'])
  })

  it('extractTopNFromPrompt reads structured and natural phrases', () => {
    expect(extractTopNFromPrompt('')).toBeNull()
    expect(extractTopNFromPrompt('top_n: 12')).toBe(12)
    expect(extractTopNFromPrompt('top-n = 9')).toBe(9)
    expect(extractTopNFromPrompt('Merci de trouver 25 profils')).toBe(25)
    expect(extractTopNFromPrompt('identifier 900 profils')).toBe(500)
    expect(extractTopNFromPrompt('identifier 0 profils')).toBeNull()
  })

  it('extractPromptSkillCandidates merges bullets and niveau lines', () => {
    expect(extractPromptSkillCandidates('')).toEqual([])
    const skills = extractPromptSkillCandidates(`
- Docker niveau 4
; Kubernetes niveau 3
`)
    expect(skills.some((s) => s.toLowerCase().includes('docker'))).toBe(true)
    expect(skills.some((s) => s.toLowerCase().includes('kubernetes'))).toBe(true)
    expect(extractPromptSkillCandidates('- Alpha / Beta niveau 2')).toContain('Alpha')
    expect(extractPromptSkillCandidates('- Alpha / Beta niveau 2')).toContain('Beta')
  })
})
