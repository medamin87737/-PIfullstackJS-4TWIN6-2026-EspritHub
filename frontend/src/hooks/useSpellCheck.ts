/**
 * useSpellCheck — Hook réutilisable pour la correction orthographique
 * via l'API LanguageTool (https://api.languagetool.org/v2/check)
 *
 * Supporte le français et l'anglais (détection automatique).
 */

import { useState, useCallback } from 'react'

const LANGUAGETOOL_URL = 'https://api.languagetool.org/v2/check'

type LTMatch = {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: { id: string; description: string }
}

type LTResponse = {
  matches: LTMatch[]
  language?: { detectedLanguage?: { code: string } }
}

export type SpellCheckResult = {
  correctedText: string
  corrections: number
  detectedLanguage: string
}

export function useSpellCheck() {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Corrige le texte en appliquant les suggestions LanguageTool.
   * Applique les corrections de droite à gauche pour préserver les offsets.
   */
  const correctText = useCallback(async (text: string): Promise<SpellCheckResult | null> => {
    if (!text.trim()) return null

    setChecking(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        text,
        language: 'auto',
        enabledOnly: 'false',
      })

      const res = await fetch(LANGUAGETOOL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      if (!res.ok) {
        throw new Error(`LanguageTool API error: ${res.status}`)
      }

      const data: LTResponse = await res.json()
      const matches = data.matches ?? []

      if (matches.length === 0) {
        return {
          correctedText: text,
          corrections: 0,
          detectedLanguage: data.language?.detectedLanguage?.code ?? 'auto',
        }
      }

      // Appliquer les corrections de droite à gauche pour ne pas décaler les offsets
      let corrected = text
      const sortedMatches = [...matches]
        .filter((m) => m.replacements.length > 0)
        .sort((a, b) => b.offset - a.offset)

      for (const match of sortedMatches) {
        const best = match.replacements[0]?.value
        if (!best) continue
        corrected =
          corrected.slice(0, match.offset) +
          best +
          corrected.slice(match.offset + match.length)
      }

      return {
        correctedText: corrected,
        corrections: sortedMatches.length,
        detectedLanguage: data.language?.detectedLanguage?.code ?? 'auto',
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Correction orthographique indisponible'
      setError(msg)
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  return { correctText, checking, error }
}
