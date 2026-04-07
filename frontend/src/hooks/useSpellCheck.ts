/**
 * useSpellCheck — Correction orthographique inline automatique
 * via l'API LanguageTool (https://api.languagetool.org/v2/check)
 *
 * Mode inline : analyse le texte pendant la frappe (debounce 1.5s)
 * et retourne les suggestions sans modifier le texte automatiquement.
 * Le RH accepte ou ignore chaque suggestion.
 */

import { useState, useCallback, useRef } from 'react'

const LANGUAGETOOL_URL = 'https://api.languagetool.org/v2/check'
const DEBOUNCE_MS = 1000

type LTMatch = {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: { id: string; description: string }
  context: { text: string; offset: number; length: number }
}

type LTResponse = {
  matches: LTMatch[]
  language?: { detectedLanguage?: { code: string } }
}

export type SpellSuggestion = {
  id: string
  original: string
  suggestion: string
  message: string
  offset: number
  length: number
}

export type SpellCheckResult = {
  correctedText: string
  corrections: number
  detectedLanguage: string
}

export function useSpellCheck() {
  const [checking, setChecking] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SpellSuggestion[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Analyse le texte et retourne les suggestions (sans modifier le texte).
   * Appelé automatiquement pendant la frappe via debounce.
   */
  const analyzeText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || text.trim().length < 10) {
      setSuggestions([])
      return
    }

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

      if (!res.ok) throw new Error(`LanguageTool API error: ${res.status}`)

      const data: LTResponse = await res.json()
      const matches = (data.matches ?? []).filter((m) => m.replacements.length > 0)

      const mapped: SpellSuggestion[] = matches.map((m, i) => ({
        id: `${i}-${m.offset}`,
        original: text.slice(m.offset, m.offset + m.length),
        suggestion: m.replacements[0].value,
        message: m.message,
        offset: m.offset,
        length: m.length,
      }))

      setSuggestions(mapped)
    } catch (err: any) {
      setError(err?.message ?? 'Correction indisponible')
      setSuggestions([])
    } finally {
      setChecking(false)
    }
  }, [])

  /**
   * Déclenche l'analyse avec debounce — à appeler dans onChange du textarea.
   */
  const scheduleAnalysis = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text.trim() || text.trim().length < 10) {
      setSuggestions([])
      setAnalyzing(false)
      return
    }
    setAnalyzing(true)
    debounceRef.current = setTimeout(() => {
      setAnalyzing(false)
      void analyzeText(text)
    }, DEBOUNCE_MS)
  }, [analyzeText])

  /**
   * Applique une suggestion au texte et la retire de la liste.
   */
  const applySuggestion = useCallback((text: string, suggestion: SpellSuggestion): string => {
    const corrected =
      text.slice(0, suggestion.offset) +
      suggestion.suggestion +
      text.slice(suggestion.offset + suggestion.length)
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    return corrected
  }, [])

  /**
   * Ignore une suggestion et la retire de la liste.
   */
  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  /**
   * Applique toutes les suggestions d'un coup (de droite à gauche).
   */
  const applyAllSuggestions = useCallback((text: string): string => {
    const sorted = [...suggestions].sort((a, b) => b.offset - a.offset)
    let result = text
    for (const s of sorted) {
      result = result.slice(0, s.offset) + s.suggestion + result.slice(s.offset + s.length)
    }
    setSuggestions([])
    return result
  }, [suggestions])

  /**
   * Correction complète en une fois (mode manuel, garde la compatibilité).
   */
  const correctText = useCallback(async (text: string): Promise<SpellCheckResult | null> => {
    if (!text.trim()) return null
    setChecking(true)
    setError(null)
    try {
      const params = new URLSearchParams({ text, language: 'auto', enabledOnly: 'false' })
      const res = await fetch(LANGUAGETOOL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if (!res.ok) throw new Error(`LanguageTool API error: ${res.status}`)
      const data: LTResponse = await res.json()
      const matches = (data.matches ?? []).filter((m) => m.replacements.length > 0)
        .sort((a, b) => b.offset - a.offset)
      let corrected = text
      for (const match of matches) {
        const best = match.replacements[0]?.value
        if (!best) continue
        corrected = corrected.slice(0, match.offset) + best + corrected.slice(match.offset + match.length)
      }
      setSuggestions([])
      return {
        correctedText: corrected,
        corrections: matches.length,
        detectedLanguage: data.language?.detectedLanguage?.code ?? 'auto',
      }
    } catch (err: any) {
      setError(err?.message ?? 'Correction indisponible')
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  return {
    correctText,
    checking,
    analyzing,
    error,
    suggestions,
    scheduleAnalysis,
    applySuggestion,
    dismissSuggestion,
    applyAllSuggestions,
  }
}
