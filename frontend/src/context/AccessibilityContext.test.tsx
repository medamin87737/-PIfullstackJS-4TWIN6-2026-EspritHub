import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessibilityProvider, useAccessibility } from './AccessibilityContext'

function Consumer(props: { onReady: (v: ReturnType<typeof useAccessibility>) => void }) {
  const ctx = useAccessibility()
  props.onReady(ctx)
  return null
}

describe('AccessibilityContext', () => {
  let container: HTMLDivElement
  let root: Root
  let ctx: ReturnType<typeof useAccessibility> | null = null

  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.lang = 'fr-FR'
    globalThis.SpeechSynthesisUtterance = class Utterance {
      lang = ''
      constructor(public text: string) {}
    } as unknown as typeof SpeechSynthesisUtterance

    globalThis.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => []),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as SpeechSynthesis

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        <AccessibilityProvider>
          <Consumer onReady={(c) => { ctx = c }} />
        </AccessibilityProvider>,
      )
    })
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('class')
  })

  it('updates zoom and contrast', () => {
    act(() => {
      ctx!.setZoom('xlarge')
      ctx!.setContrastPercent(140)
      ctx!.toggleVisualFatigueMode()
      ctx!.toggleColorBlindMode()
    })
    expect(document.documentElement.style.fontSize).toContain('px')
    expect(document.documentElement.style.filter.length).toBeGreaterThan(0)
    expect(document.documentElement.classList.contains('colorblind')).toBe(true)
  })

  it('manages custom palette and reset', () => {
    act(() => {
      ctx!.setCustomPalette({
        primary: '#336699',
        background: '#ffffff',
      })
    })
    expect(localStorage.getItem('accessibility_custom_palette')).toContain('336699')
    act(() => {
      ctx!.resetCustomPalette()
    })
    expect(localStorage.getItem('accessibility_custom_palette')).toBeNull()
  })

  it('speak and stopSpeaking use speechSynthesis', () => {
    act(() => {
      ctx!.speak('hello')
      ctx!.stopSpeaking()
    })
    expect(globalThis.speechSynthesis.cancel).toHaveBeenCalled()
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled()
  })

  it('toggleVoiceCommands starts recognition when available', () => {
    class FakeRec {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((e: unknown) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null
      start = vi.fn()
      stop = vi.fn()
    }
    ;(globalThis as unknown as { SpeechRecognition: new () => FakeRec }).SpeechRecognition = FakeRec

    act(() => {
      ctx!.toggleVoiceCommands()
    })

    act(() => {
      ctx!.toggleVoiceCommands()
    })
  })

  it('toggleVoiceCommands alerts when SpeechRecognition missing', () => {
    delete (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    delete (globalThis as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
    act(() => {
      ctx!.toggleVoiceCommands()
    })
    expect(alertSpy).toHaveBeenCalled()
  })

  it('handleVoiceCommand dispatches login event', async () => {
    let lastRec: DispatchFakeRec | null = null
    class DispatchFakeRec {
      lang = ''
      continuous = true
      interimResults = false
      start = vi.fn(() => {
        lastRec = this
      })
      stop = vi.fn()
      onresult: ((e: any) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null
    }
    ;(globalThis as unknown as { SpeechRecognition: new () => DispatchFakeRec }).SpeechRecognition =
      DispatchFakeRec

    const listener = vi.fn()
    globalThis.addEventListener('skillup-voice-command', listener as EventListener)

    act(() => {
      ctx!.toggleVoiceCommands()
    })

    await act(async () => {
      lastRec?.onresult?.({
        results: [[{ transcript: 'se connecter' }]],
      })
      await Promise.resolve()
    })

    expect(listener).toHaveBeenCalled()
    globalThis.removeEventListener('skillup-voice-command', listener as EventListener)

    act(() => {
      ctx!.toggleVoiceCommands()
    })
  })
})
