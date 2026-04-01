/**
 * useRewrite — Hook réutilisable pour reformuler/corriger/améliorer un texte
 * via le backend NestJS POST /chat/rewrite (OpenRouter / DeepSeek).
 *
 * La clé API reste côté serveur — aucune clé exposée dans le frontend.
 */

import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type RewriteResult = {
  rewritten: string
  model: string
}

export function useRewrite() {
  const [rewriting, setRewriting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rewrite = useCallback(async (text: string, context?: string): Promise<RewriteResult | null> => {
    if (!text.trim()) return null

    setRewriting(true)
    setError(null)

    const token =
      localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token')

    try {
      const res = await fetch(`${API_BASE_URL}/chat/rewrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: text,
          targetLanguage: 'fr',
          outputFormat: 'text',
          constraints: context ??
            'Reformule ce texte en message professionnel clair et poli. ' +
            'Corrige les fautes, améliore la formulation. ' +
            'Conserve le sens original. Réponds uniquement avec le texte reformulé, sans explication.',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? `Erreur serveur (${res.status})`)
      }

      const data = await res.json()
      const rewritten = String(data?.rewritten ?? '').trim()
      if (!rewritten) throw new Error('Réponse vide du service de reformulation')

      return { rewritten, model: String(data?.model ?? 'unknown') }
    } catch (err: any) {
      const msg = err?.message ?? 'Service de reformulation indisponible'
      setError(msg)
      return null
    } finally {
      setRewriting(false)
    }
  }, [])

  return { rewrite, rewriting, error }
}
