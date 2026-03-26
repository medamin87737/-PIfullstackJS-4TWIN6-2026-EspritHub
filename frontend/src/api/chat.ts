const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getAuthStorage(): Storage {
  return localStorage.getItem('auth_remember_me') === 'true' ? localStorage : sessionStorage
}

function getAuthItem(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getAuthItem('auth_refresh_token')
  if (!refreshToken) return null

  const res = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) return null
  const payload = await res.json()
  const token = payload.token as string | undefined
  if (!token) return null
  getAuthStorage().setItem('auth_token', token)
  return token
}

export type RewritePromptRequest = {
  prompt: string
  constraints?: string
  outputFormat?: 'text' | 'json'
  targetLanguage?: string
}

export type RewritePromptResponse = {
  rewritten: string
  model: string
  outputFormat: 'text' | 'json'
}

export async function rewritePrompt(req: RewritePromptRequest): Promise<RewritePromptResponse> {
  let token = getAuthItem('auth_token')
  if (!token) {
    token = await refreshAccessToken()
  }
  if (!token) {
    throw new Error('Utilisateur non authentifié')
  }

  let res = await fetch(`${API_BASE_URL}/chat/rewrite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  })

  // Backend guards can return 401 or 403 for expired/invalid token.
  if (res.status === 401 || res.status === 403) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(`${API_BASE_URL}/chat/rewrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify(req),
      })
    }
  }

  if (!res.ok) {
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') {
        throw new Error(data.message)
      }
      if (Array.isArray(data?.message) && data.message.length > 0) {
        throw new Error(String(data.message[0]))
      }
      throw new Error(`Erreur serveur: ${res.status}`)
    } catch (e: any) {
      if (e instanceof Error) throw e
      const text = await res.text().catch(() => '')
      throw new Error(text || `Erreur serveur: ${res.status}`)
    }
  }

  return res.json()
}

