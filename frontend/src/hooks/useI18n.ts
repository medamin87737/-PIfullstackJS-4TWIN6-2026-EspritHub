import { useAccessibility } from '../context/AccessibilityContext'
import { t as translate } from '../i18n'

export function useI18n() {
  const { language } = useAccessibility()
  return (key: string) => translate(language, key)
}

