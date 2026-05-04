import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSpeechRecognition } from './useSpeechRecognition'

class MockRecognition {
  lang = 'fr-FR'
  continuous = false
  interimResults = true
  maxAlternatives = 1
  onresult: ((e: any) => void) | null = null
  onerror: ((e: any) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null
  start() {
    this.onstart?.()
  }
  stop() {
    this.onend?.()
  }
  abort() {
    this.onend?.()
  }
  emitResult(results: any[], resultIndex = 0) {
    this.onresult?.({ results, resultIndex })
  }
  emitError(error: string) {
    this.onerror?.({ error })
  }
}

function Consumer(props: { onReady: (hook: ReturnType<typeof useSpeechRecognition>) => void }) {
  const hook = useSpeechRecognition()
  props.onReady(hook)
  return null
}

describe('useSpeechRecognition', () => {
  let container: HTMLDivElement
  let root: Root
  let hookRef: ReturnType<typeof useSpeechRecognition> | null = null
  let recognition: MockRecognition

  beforeEach(async () => {
    recognition = new MockRecognition()
    ;(window as any).SpeechRecognition = function Ctor() {
      return recognition
    }

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
    delete (window as any).SpeechRecognition
    delete (window as any).webkitSpeechRecognition
  })

  it('starts listening, emits final text, then stops', () => {
    const onFinal = (text: string) => {
      expect(text).toBe('bonjour final')
    }

    act(() => {
      hookRef!.startListening(onFinal)
    })
    expect(hookRef!.status).toBe('listening')

    act(() => {
      recognition.emitResult([
        { 0: { transcript: 'bonjour interim ' }, isFinal: false },
        { 0: { transcript: 'bonjour final' }, isFinal: true },
      ])
    })
    expect(hookRef!.interimText).toBe('')

    act(() => {
      hookRef!.stopListening()
    })
    expect(hookRef!.status).toBe('idle')
  })

  it('maps known errors and handles unknown error', () => {
    act(() => {
      hookRef!.startListening(() => {})
    })

    act(() => {
      recognition.emitError('no-speech')
    })
    expect(hookRef!.status).toBe('error')
    expect(hookRef!.errorMessage).toContain('Aucune parole')

    act(() => {
      recognition.emitError('custom')
    })
    expect(hookRef!.errorMessage).toContain('custom')
  })

  it('sets unsupported when API is missing', async () => {
    root.unmount()
    delete (window as any).SpeechRecognition
    delete (window as any).webkitSpeechRecognition

    await act(async () => {
      root = createRoot(container)
      root.render(<Consumer onReady={(hook) => { hookRef = hook }} />)
    })

    act(() => {
      hookRef!.startListening(() => {})
    })
    expect(hookRef!.status).toBe('unsupported')
    expect(hookRef!.errorMessage).toContain('non supportée')
  })
})

