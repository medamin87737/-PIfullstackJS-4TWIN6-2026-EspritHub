import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recommendation } from '../types/hand-gesture.types'

const { mockStartCamera, mockStopCamera } = vi.hoisted(() => ({
  mockStartCamera: vi.fn(async () => {}),
  mockStopCamera: vi.fn(),
}))

vi.mock('../hooks/useHandGesture', () => ({
  useHandGesture: () => ({
    videoRef: { current: document.createElement('video') },
    canvasRef: { current: document.createElement('canvas') },
    isActive: false,
    currentGesture: 'UNKNOWN' as const,
    confidenceScore: 0,
    fps: 12,
    error: null,
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
  }),
}))

vi.mock('../services/recommendationService', () => ({
  RecommendationService: class {
    updateToken = vi.fn()
    respondToRecommendation = vi.fn().mockResolvedValue({ success: true })
  },
}))

import { HandGestureControl } from './HandGestureControl'

const sampleRec = (id: string): Recommendation => ({
  id,
  title: 'Formation React',
  description: 'Montée en compétences',
  category: 'Tech',
  createdAt: new Date('2026-01-01'),
})

describe('HandGestureControl', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mockStartCamera.mockClear()
    mockStopCamera.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.clearAllMocks()
  })

  it('renders empty recommendations message', async () => {
    await act(async () => {
      root.render(
        <HandGestureControl recommendations={[]} onRecommendationResponse={() => {}} authToken="tok" />,
      )
    })
    expect(container.textContent).toContain('Aucune recommandation')
  })

  it('accept button notifies parent when API succeeds', async () => {
    const onRecommendationResponse = vi.fn()
    await act(async () => {
      root.render(
        <HandGestureControl
          recommendations={[sampleRec('rec-1')]}
          onRecommendationResponse={onRecommendationResponse}
          authToken="tok"
        />,
      )
    })

    const accept = container.querySelector('[aria-label="Accepter la recommandation"]') as HTMLButtonElement
    await act(async () => {
      accept.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onRecommendationResponse).toHaveBeenCalledWith('rec-1', 'ACCEPTED')
  })

  it('reject button notifies parent when API succeeds', async () => {
    const onRecommendationResponse = vi.fn()
    await act(async () => {
      root.render(
        <HandGestureControl
          recommendations={[sampleRec('rec-2')]}
          onRecommendationResponse={onRecommendationResponse}
          authToken="tok"
        />,
      )
    })

    const reject = container.querySelector('[aria-label="Refuser la recommandation"]') as HTMLButtonElement
    await act(async () => {
      reject.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onRecommendationResponse).toHaveBeenCalledWith('rec-2', 'REJECTED')
  })

  it('toggle camera calls startCamera when inactive', async () => {
    await act(async () => {
      root.render(
        <HandGestureControl
          recommendations={[sampleRec('rec-3')]}
          onRecommendationResponse={() => {}}
          authToken="tok"
        />,
      )
    })

    const cam = container.querySelector('[aria-label="Activer la caméra"]') as HTMLButtonElement
    await act(async () => {
      cam.click()
      await Promise.resolve()
    })

    expect(mockStartCamera).toHaveBeenCalled()
  })
})
