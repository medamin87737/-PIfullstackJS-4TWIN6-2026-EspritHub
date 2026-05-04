import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isPuterAvailable, translateBatch, translateWithFallback, translateWithPuter } from './puterService'

describe('puterService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    ;(globalThis as any).window = globalThis
    ;(globalThis as any).puter = undefined
  })

  it('detects availability', () => {
    expect(isPuterAvailable()).toBe(false)
    ;(globalThis as any).puter = { ai: { chat: vi.fn() } }
    expect(isPuterAvailable()).toBe(true)
  })

  it('returns original for fr/auto/empty', async () => {
    await expect(translateWithPuter('', 'en')).resolves.toBe('')
    await expect(translateWithPuter('bonjour', 'fr')).resolves.toBe('bonjour')
    await expect(translateWithPuter('bonjour', 'auto')).resolves.toBe('bonjour')
  })

  it('returns original when puter is unavailable', async () => {
    await expect(translateWithPuter('bonjour', 'en')).resolves.toBe('bonjour')
  })

  it('translates with puter and strips wrapping quotes', async () => {
    ;(globalThis as any).puter = {
      ai: {
        chat: vi.fn().mockResolvedValue('"hello"'),
      },
    }
    await expect(translateWithPuter('bonjour', 'en')).resolves.toBe('hello')
  })

  it('falls back to MyMemory when puter throws', async () => {
    ;(globalThis as any).puter = {
      ai: {
        chat: vi.fn().mockRejectedValue(new Error('boom')),
      },
    }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responseStatus: 200, responseData: { translatedText: 'fallback hello' } }),
    })
    await expect(translateWithPuter('bonjour', 'en')).resolves.toBe('fallback hello')
  })

  it('translateWithFallback catches unexpected failures', async () => {
    ;(globalThis as any).puter = {
      ai: {
        chat: vi.fn().mockRejectedValue(new Error('boom')),
      },
    }
    fetchMock.mockRejectedValueOnce(new Error('network'))
    await expect(translateWithFallback('bonjour', 'en')).resolves.toBe('bonjour')
  })

  it('translateBatch returns originals in fr/unavailable and loops otherwise', async () => {
    await expect(translateBatch(['a', 'b'], 'fr')).resolves.toEqual(['a', 'b'])

    ;(globalThis as any).puter = { ai: { chat: vi.fn().mockResolvedValue('ok') } }
    await expect(translateBatch(['a', 'b'], 'en')).resolves.toEqual(['ok', 'ok'])
  })
})

