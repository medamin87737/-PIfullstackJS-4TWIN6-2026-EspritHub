import { describe, expect, it } from 'vitest'
import { getSupportedLanguages, hasTranslation, t } from './i18n'

describe('i18n utils', () => {
  it('translates known keys for explicit language', () => {
    expect(t('sidebar.hr.activities', 'en')).toBe('Activities')
    expect(t('sidebar.hr.activities', 'es')).toBe('Actividades')
  })

  it('falls back to french for auto/fr and key when missing', () => {
    expect(t('sidebar.hr.dashboard', 'auto')).toBe('Dashboard')
    expect(t('unknown.key', 'fr')).toBe('unknown.key')
  })

  it('checks translation existence', () => {
    expect(hasTranslation('sidebar.admin.users')).toBe(true)
    expect(hasTranslation('does.not.exist')).toBe(false)
  })

  it('returns supported language metadata', () => {
    const langs = getSupportedLanguages()
    expect(langs.map((l) => l.code)).toEqual(['fr', 'en', 'es', 'de', 'it'])
  })
})

