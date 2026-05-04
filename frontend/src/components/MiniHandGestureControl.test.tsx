import React, { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockStartCamera, mockStopCamera } = vi.hoisted(() => ({
  mockStartCamera: vi.fn(async () => {}),
  mockStopCamera: vi.fn(),
}))

vi.mock('../hooks/useHandGesture', () => ({
  useHandGesture: () => ({
    videoRef: { current: document.createElement('video') },
    canvasRef: { current: document.createElement('canvas') },
    currentGesture: 'UNKNOWN' as const,
    confidenceScore: 0,
    error: null as string | null,
    startCamera: mockStartCamera,
    stopCamera: mockStopCamera,
  }),
}))

import { MiniHandGestureControl } from './MiniHandGestureControl'

describe('MiniHandGestureControl', () => {
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

  it('shows activate button when inactive', async () => {
    const onToggle = vi.fn()
    await act(async () => {
      root.render(
        <MiniHandGestureControl
          recommendationId="r1"
          onAccept={() => {}}
          onReject={() => {}}
          isActive={false}
          onToggle={onToggle}
        />,
      )
    })
    expect(container.textContent).toContain('Contrôle gestuel')
    await act(async () => {
      ;(container.querySelector('button') as HTMLButtonElement).click()
    })
    expect(onToggle).toHaveBeenCalled()
  })

  it('starts camera when active and stops after parent turns inactive', async () => {
    function Host() {
      const [active, setActive] = useState(true)
      return (
        <MiniHandGestureControl
          recommendationId="r1"
          onAccept={() => {}}
          onReject={() => {}}
          isActive={active}
          onToggle={() => setActive((a) => !a)}
        />
      )
    }
    await act(async () => {
      root.render(<Host />)
      await Promise.resolve()
    })
    expect(mockStartCamera).toHaveBeenCalled()

    await act(async () => {
      ;(container.querySelector('button[title="Désactiver"]') as HTMLButtonElement).click()
      await Promise.resolve()
    })
    expect(mockStopCamera).toHaveBeenCalled()
  })
})
