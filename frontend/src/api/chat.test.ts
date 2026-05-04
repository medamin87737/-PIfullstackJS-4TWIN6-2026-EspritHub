import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { askWebsiteGuide, rewritePrompt } from './chat'

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<any>
  text: () => Promise<string>
}

function response(payload: any, opts?: { ok?: boolean; status?: number; text?: string }): MockResponse {
  return {
    ok: opts?.ok ?? true,
    status: opts?.status ?? 200,
    json: async () => payload,
    text: async () => opts?.text ?? '',
  }
}

describe('chat api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rewritePrompt succeeds with existing auth token', async () => {
    localStorage.setItem('auth_token', 'token-1')
    fetchMock.mockResolvedValueOnce(response({ rewritten: 'ok', model: 'x', outputFormat: 'text' }))

    const result = await rewritePrompt({ prompt: 'hello' })
    expect(result.rewritten).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rewritePrompt refreshes token when missing and retries 401', async () => {
    localStorage.setItem('auth_refresh_token', 'refresh-1')
    fetchMock
      .mockResolvedValueOnce(response({ token: 'new-token' }))
      .mockResolvedValueOnce(response({}, { ok: false, status: 401 }))
      .mockResolvedValueOnce(response({ token: 'new-token-2' }))
      .mockResolvedValueOnce(response({ rewritten: 'done', model: 'm', outputFormat: 'json' }))

    const result = await rewritePrompt({ prompt: 'test', outputFormat: 'json' })
    expect(result.rewritten).toBe('done')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('rewritePrompt throws server message when backend returns message', async () => {
    localStorage.setItem('auth_token', 'token-1')
    fetchMock.mockResolvedValueOnce(response({ message: 'bad request' }, { ok: false, status: 400 }))

    await expect(rewritePrompt({ prompt: 'x' })).rejects.toThrow('bad request')
  })

  it('rewritePrompt throws first item when backend returns message array', async () => {
    localStorage.setItem('auth_token', 'token-1')
    fetchMock.mockResolvedValueOnce(response({ message: ['first err'] }, { ok: false, status: 400 }))

    await expect(rewritePrompt({ prompt: 'x' })).rejects.toThrow('first err')
  })

  it('rewritePrompt surfaces parsing error when json parsing fails', async () => {
    localStorage.setItem('auth_token', 'token-1')
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('bad json')
      },
      text: async () => 'plain failure',
    })

    await expect(rewritePrompt({ prompt: 'x' })).rejects.toThrow('bad json')
  })

  it('askWebsiteGuide throws unauthenticated when no tokens available', async () => {
    await expect(askWebsiteGuide({ message: 'hello' })).rejects.toThrow('Utilisateur non authentifie')
  })

  it('askWebsiteGuide succeeds after refresh flow', async () => {
    sessionStorage.setItem('auth_refresh_token', 'refresh-2')
    fetchMock
      .mockResolvedValueOnce(response({ token: 'new-token-2' }))
      .mockResolvedValueOnce(response({ reply: 'Bonjour', timestamp: 'now' }))

    const result = await askWebsiteGuide({ message: 'bonjour' })
    expect(result.reply).toBe('Bonjour')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('askWebsiteGuide handles 403 and retries with new token', async () => {
    localStorage.setItem('auth_token', 'stale-token')
    localStorage.setItem('auth_refresh_token', 'refresh-3')
    fetchMock
      .mockResolvedValueOnce(response({}, { ok: false, status: 403 }))
      .mockResolvedValueOnce(response({ token: 'new-token-3' }))
      .mockResolvedValueOnce(response({ reply: 'ok', timestamp: 't' }))

    const result = await askWebsiteGuide({ message: 'm' })
    expect(result.reply).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('askWebsiteGuide throws backend message on 400', async () => {
    localStorage.setItem('auth_token', 't')
    fetchMock.mockResolvedValueOnce(response({ message: 'not allowed' }, { ok: false, status: 400 }))

    await expect(askWebsiteGuide({ message: 'x' })).rejects.toThrow('not allowed')
  })

  it('askWebsiteGuide throws generic server error when body has no message field', async () => {
    localStorage.setItem('auth_token', 't')
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ other: true }),
      text: async () => 'bad gateway body',
    })

    await expect(askWebsiteGuide({ message: 'x' })).rejects.toThrow('Erreur serveur: 502')
  })
})

