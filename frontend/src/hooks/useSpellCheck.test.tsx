import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpellCheck } from './useSpellCheck'

function Consumer(props: { onReady: (hook: ReturnType<typeof useSpellCheck>) => void }) {
  const hook = useSpellCheck()
  props.onReady(hook)
  return null
}

describe('useSpellCheck', () => {
  let container: HTMLDivElement
  let root: Root
  let hookRef: ReturnType<typeof useSpellCheck> | null = null
  const fetchMock = vi.fn()

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<Consumer onReady={(hook) => { hookRef = hook }} />)
    })
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('scheduleAnalysis ignores very short text', () => {
    act(() => {
      hookRef!.scheduleAnalysis('short')
    })
    expect(hookRef!.analyzing).toBe(false)
    expect(hookRef!.suggestions).toEqual([])
  })

  it('analyzes text and maps suggestions', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          {
            message: 'replace',
            offset: 0,
            length: 5,
            replacements: [{ value: 'Bonjour' }],
            rule: { id: 'x', description: 'x' },
            context: { text: 'hello world', offset: 0, length: 5 },
          },
        ],
      }),
    })

    act(() => {
      hookRef!.scheduleAnalysis('hello world text')
    })
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(hookRef!.suggestions.length).toBe(1)
    expect(hookRef!.suggestions[0].suggestion).toBe('Bonjour')
  })

  it('apply, dismiss and applyAll suggestions', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          {
            message: 'first',
            offset: 0,
            length: 5,
            replacements: [{ value: 'Salut' }],
            rule: { id: 'a', description: 'a' },
            context: { text: 'hello world', offset: 0, length: 5 },
          },
          {
            message: 'second',
            offset: 6,
            length: 5,
            replacements: [{ value: 'monde' }],
            rule: { id: 'b', description: 'b' },
            context: { text: 'hello world', offset: 6, length: 5 },
          },
        ],
      }),
    })

    await act(async () => {
      await hookRef!.scheduleAnalysis('hello world long text')
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    const first = hookRef!.suggestions[0]
    const corrected = hookRef!.applySuggestion('hello world', first)
    expect(corrected).toContain('Salut')

    if (hookRef!.suggestions[0]) {
      act(() => hookRef!.dismissSuggestion(hookRef!.suggestions[0].id))
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [{
          message: 'x',
          offset: 0,
          length: 5,
          replacements: [{ value: 'Salut' }],
          rule: { id: 'x', description: 'x' },
          context: { text: 'hello world', offset: 0, length: 5 },
        }],
      }),
    })
    await act(async () => {
      hookRef!.scheduleAnalysis('hello world long text')
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    const all = hookRef!.applyAllSuggestions('hello world')
    expect(all).toContain('Salut')
  })

  it('correctText returns null on error and result on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
    })
    await expect(hookRef!.correctText('bonjour long text')).resolves.toBeNull()
    expect(hookRef!.suggestions).toEqual([])

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [{
          message: 'x',
          offset: 0,
          length: 7,
          replacements: [{ value: 'salut' }],
          rule: { id: 'x', description: 'x' },
          context: { text: 'bonjour', offset: 0, length: 7 },
        }],
        language: { detectedLanguage: { code: 'fr' } },
      }),
    })
    const out = await hookRef!.correctText('bonjour')
    expect(out?.correctedText).toContain('salut')
    expect(out?.corrections).toBe(1)
    expect(out?.detectedLanguage).toBe('fr')
  })
})

