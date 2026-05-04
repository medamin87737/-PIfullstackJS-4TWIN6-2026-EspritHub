import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRewrite } from './useRewrite'

function Consumer(props: { onReady: (hook: ReturnType<typeof useRewrite>) => void }) {
  const hook = useRewrite()
  props.onReady(hook)
  return null
}

describe('useRewrite', () => {
  let container: HTMLDivElement
  let root: Root
  let hookRef: ReturnType<typeof useRewrite> | null = null
  const fetchMock = vi.fn()

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
    sessionStorage.clear()
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
    vi.restoreAllMocks()
  })

  it('returns null for empty text', async () => {
    await expect(hookRef!.rewrite('   ')).resolves.toBeNull()
  })

  it('rewrites successfully with token', async () => {
    localStorage.setItem('auth_token', 'tok')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rewritten: 'Texte reformule', model: 'm1' }),
    })
    const out = await hookRef!.rewrite('bonjour')
    expect(out).toEqual({ rewritten: 'Texte reformule', model: 'm1' })
  })

  it('sets error on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'bad request' }),
    })
    let out: Awaited<ReturnType<ReturnType<typeof useRewrite>['rewrite']>> = null
    await act(async () => {
      out = await hookRef!.rewrite('hello')
    })
    expect(out).toBeNull()
    expect(hookRef!.error).toContain('bad request')
  })

  it('handles empty rewritten response and network failures', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rewritten: '   ' }),
    })
    await act(async () => {
      await expect(hookRef!.rewrite('hello')).resolves.toBeNull()
    })

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await expect(hookRef!.rewrite('hello')).resolves.toBeNull()
    })
    expect(hookRef!.error).toBe('offline')
  })
})

