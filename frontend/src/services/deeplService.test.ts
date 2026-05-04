import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectLanguage, translateBatch, translateWithDeepL } from './deeplService'

function mockFetchResponse(ok: boolean, payload: any, textValue = 'err') {
  return {
    ok,
    json: async () => payload,
    text: async () => textValue,
  }
}

describe('deeplService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.stubEnv('VITE_DEEPL_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns original text for fr/auto target', async () => {
    await expect(translateWithDeepL('bonjour', 'fr')).resolves.toBe('bonjour')
    await expect(translateWithDeepL('bonjour', 'auto')).resolves.toBe('bonjour')
  })

  it('translates with API when available', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(true, {
        translations: [{ detected_source_language: 'FR', text: 'hello' }],
      }),
    )
    await expect(translateWithDeepL('bonjour', 'en')).resolves.toBe('hello')
  })

  it('falls back on API errors', async () => {
    fetchMock.mockResolvedValueOnce(mockFetchResponse(false, {}, 'bad request'))
    await expect(translateWithDeepL('bonjour', 'en')).resolves.toBe('bonjour')

    fetchMock.mockRejectedValueOnce(new Error('network'))
    await expect(translateWithDeepL('bonjour', 'en')).resolves.toBe('bonjour')
  })

  it('detectLanguage uses FR fallback on errors', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(true, {
        translations: [{ detected_source_language: 'EN', text: 'x' }],
      }),
    )
    await expect(detectLanguage('hello')).resolves.toBe('EN')

    fetchMock.mockResolvedValueOnce(mockFetchResponse(false, {}))
    await expect(detectLanguage('hello')).resolves.toBe('FR')
  })

  it('translateBatch handles success and fallback', async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(true, {
        translations: [{ text: 'one' }, { text: 'two' }],
      }),
    )
    await expect(translateBatch(['un', 'deux'], 'en')).resolves.toEqual(['one', 'two'])

    fetchMock.mockResolvedValueOnce(mockFetchResponse(false, {}))
    await expect(translateBatch(['un'], 'en')).resolves.toEqual(['un'])
  })
})

