import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TranslationProvider, useTranslation } from './TranslationContext'

function Consumer(props: { onReady: (ctx: ReturnType<typeof useTranslation>) => void }) {
  const ctx = useTranslation()
  props.onReady(ctx)
  return null
}

describe('TranslationContext', () => {
  let container: HTMLDivElement
  let root: Root
  const fetchMock = vi.fn()
  let ctxRef: ReturnType<typeof useTranslation> | null = null

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    container = document.createElement('div')
    document.body.innerHTML = ''
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
  })

  const renderProvider = async () => {
    await act(async () => {
      root.render(
        <TranslationProvider>
          <Consumer onReady={(ctx) => { ctxRef = ctx }} />
        </TranslationProvider>,
      )
    })
  }

  it('exposes supported languages and identity t()', async () => {
    await renderProvider()
    expect(ctxRef?.supportedLanguages.length).toBeGreaterThan(5)
    expect(ctxRef?.t('abc')).toBe('abc')
    expect(ctxRef?.detectedLang).toBe('fr')
  })

  it('translates root text nodes then restores on fr', async () => {
    const rootDiv = document.createElement('div')
    rootDiv.id = 'root'
    rootDiv.textContent = 'Bonjour le monde'
    document.body.appendChild(rootDiv)

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [[['Hello world']]],
    })

    await renderProvider()
    act(() => {
      ctxRef!.setLanguage('en')
    })
    await act(async () => {
      await ctxRef!.translatePage()
    })
    expect(rootDiv.textContent).toContain('Hello world')

    act(() => {
      ctxRef!.setLanguage('fr')
    })
    await act(async () => {
      await ctxRef!.translatePage()
    })
    expect(rootDiv.textContent).toContain('Bonjour le monde')
  })
})

