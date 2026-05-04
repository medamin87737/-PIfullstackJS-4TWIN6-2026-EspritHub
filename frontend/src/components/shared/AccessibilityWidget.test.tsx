import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessibilityProvider } from '../../context/AccessibilityContext'
import { TranslationProvider } from '../../context/TranslationContext'
import AccessibilityWidget from './AccessibilityWidget'

describe('AccessibilityWidget', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn())
    class MockSpeechRecognition {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((e: unknown) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null
      start = vi.fn()
      stop = vi.fn()
    }
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition as never)
    vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition as never)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [[['Translated']]],
      }),
    )
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    appRoot.textContent = 'Bonjour le test'
    document.body.appendChild(appRoot)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    document.getElementById('root')?.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  const renderWidget = async () => {
    await act(async () => {
      root.render(
        <AccessibilityProvider>
          <TranslationProvider>
            <AccessibilityWidget />
          </TranslationProvider>
        </AccessibilityProvider>,
      )
    })
  }

  const openPanel = async () => {
    const fab = document.querySelector('button[aria-label^="Options"]') as HTMLButtonElement
    expect(fab).toBeTruthy()
    await act(async () => {
      fab.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('opens panel and toggles zoom, voice, toast sound, and daltonien', async () => {
    await renderWidget()
    await openPanel()

    const zoomXlarge = [...document.querySelectorAll('button')].find((b) => b.textContent === 'A++')
    await act(async () => {
      zoomXlarge?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const voiceBtn = [...document.querySelectorAll('button')].find((b) =>
      /commandes vocales/i.test(b.textContent ?? ''),
    )
    await act(async () => {
      voiceBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const toastHeading = [...document.querySelectorAll('p')].find((p) =>
      (p.textContent ?? '').includes('Son des popups'),
    )
    const toastToggle = toastHeading?.parentElement?.querySelector('button[aria-pressed]')
    await act(async () => {
      toastToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(localStorage.getItem('accessibility_toast_sound_enabled')).toBe('false')

    const colorBlindBtn = document.querySelector('button[aria-label="Activer le mode daltonien"]')
    await act(async () => {
      colorBlindBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(document.documentElement.classList.contains('colorblind')).toBe(true)
  })

  it('changes language, retriggers translate with fake timers, and adjusts palette and contrast', async () => {
    vi.useFakeTimers()
    await renderWidget()
    await openPanel()

    const enBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('English'))
    await act(async () => {
      enBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      vi.advanceTimersByTime(60)
    })

    const retranslate = [...document.querySelectorAll('button')].find((b) => /Retraduire/i.test(b.textContent ?? ''))
    await act(async () => {
      retranslate?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement
    await act(async () => {
      colorInput.value = '#112233'
      colorInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      ;[...document.querySelectorAll('button')]
        .find((b) => b.textContent === 'Reinitialiser')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const fatigueBtn = document.querySelector('button[aria-label="Activer le filtre anti lumiere bleue"]')
    await act(async () => {
      fatigueBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const range = document.querySelector('input[type="range"]') as HTMLInputElement
    const setRange = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setRange?.call(range, '120')
      range.dispatchEvent(new Event('input', { bubbles: true }))
      range.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const select = document.querySelector('select') as HTMLSelectElement
    await act(async () => {
      select.value = 'de'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      vi.advanceTimersByTime(60)
    })

    vi.useRealTimers()
    expect(localStorage.getItem('accessibility_contrast_percent')).toBe('120')
    expect(localStorage.getItem('accessibility_visual_fatigue')).toBe('true')
  })

  it('toggles auto-read selection switch', async () => {
    await renderWidget()
    await openPanel()
    const autoReadBtn = [...document.querySelectorAll('button[aria-pressed]')].find((b) =>
      b.closest('.mb-3')?.textContent?.includes('Lecture vocale'),
    )
    await act(async () => {
      autoReadBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  })
})
