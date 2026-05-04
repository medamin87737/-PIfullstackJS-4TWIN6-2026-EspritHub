import React, { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GestureType, NormalizedLandmark } from '../types/hand-gesture.types'
import { useHandGesture } from './useHandGesture'

const lmThumbsUp: NormalizedLandmark[] = (() => {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
  landmarks[0] = { x: 0.5, y: 0.85, z: 0 }
  landmarks[9] = { x: 0.5, y: 0.62, z: 0 }
  landmarks[2] = { x: 0.48, y: 0.72, z: 0 }
  landmarks[3] = { x: 0.49, y: 0.62, z: 0 }
  landmarks[4] = { x: 0.5, y: 0.52, z: 0 }
  for (const mcp of [5, 9, 13, 17]) {
    landmarks[mcp + 3] = {
      x: landmarks[mcp].x + 0.02,
      y: landmarks[mcp].y + 0.02,
      z: 0,
    }
  }
  return landmarks
})()

vi.mock('@mediapipe/hands', () => {
  class Hands {
    setOptions() {}
    onResults(_cb: unknown) {
      ;(this as unknown as { _cb: unknown })._cb = _cb
    }
    close() {}
    async send() {
      const cb = (this as unknown as { _cb?: (r: unknown) => void })._cb
      cb?.({
        multiHandLandmarks: [lmThumbsUp],
        multiHandedness: [{ score: 0.95 }],
      })
    }
  }
  return { Hands }
})

vi.mock('@mediapipe/camera_utils', () => ({
  Camera: class Camera {
    private readonly onFrame: () => Promise<void>
    constructor(_video: unknown, opts: { onFrame: () => Promise<void> }) {
      this.onFrame = opts.onFrame
    }
    async start() {
      await this.onFrame()
    }
    stop() {}
  },
}))

function Host(props: {
  minConfidence?: number
  onGestureDetected: (g: GestureType) => void
  onReady: (api: ReturnType<typeof useHandGesture>) => void
}) {
  const api = useHandGesture({
    onGestureDetected: props.onGestureDetected,
    minConfidence: props.minConfidence ?? 0.1,
  })
  useEffect(() => {
    props.onReady(api)
  })
  return (
    <>
      <video ref={api.videoRef} width={320} height={240} muted playsInline />
      <canvas ref={api.canvasRef} width={320} height={240} />
    </>
  )
}

describe('useHandGesture', () => {
  let container: HTMLDivElement
  let root: Root
  let apiRef: ReturnType<typeof useHandGesture> | null = null

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    const stream = {
      getTracks: () => [{ stop: vi.fn() }],
    }
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
    apiRef = null
  })

  it('starts and stops camera pipeline', async () => {
    const onGesture = vi.fn()
    await act(async () => {
      root.render(
        <Host
          onGestureDetected={(g) => onGesture(g)}
          onReady={(a) => {
            apiRef = a
          }}
        />,
      )
    })
    expect(apiRef).not.toBeNull()
    await act(async () => {
      const camPromise = apiRef!.startCamera()
      queueMicrotask(() => {
        const video = container.querySelector('video')
        video?.dispatchEvent(new Event('loadedmetadata'))
      })
      await camPromise
    })
    expect(onGesture).toHaveBeenCalled()
    expect(apiRef!.isActive).toBe(true)
    act(() => {
      apiRef!.stopCamera()
    })
    expect(apiRef!.isActive).toBe(false)
  })

  it('sets error when video ref is missing', async () => {
    function BadHost() {
      const api = useHandGesture({
        onGestureDetected: vi.fn(),
        minConfidence: 0.1,
      })
      useEffect(() => {
        apiRef = api
      })
      return <canvas ref={api.canvasRef} width={16} height={16} />
    }
    await act(async () => {
      root.render(<BadHost />)
    })
    await act(async () => {
      await apiRef!.startCamera()
    })
    expect(apiRef!.error?.toLowerCase()).toMatch(/webcam|caméra|acces/)
  })

  it('maps getUserMedia NotAllowedError', async () => {
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
    )
    const onGesture = vi.fn()
    await act(async () => {
      root.render(
        <Host
          onGestureDetected={(g) => onGesture(g)}
          onReady={(a) => {
            apiRef = a
          }}
        />,
      )
    })
    await act(async () => {
      await apiRef!.startCamera()
    })
    expect(apiRef!.error).toContain('Permission')
  })

  it('runs visibilitychange handler while active', async () => {
    const onGesture = vi.fn()
    await act(async () => {
      root.render(
        <Host
          onGestureDetected={(g) => onGesture(g)}
          onReady={(a) => {
            apiRef = a
          }}
        />,
      )
    })
    await act(async () => {
      const camPromise = apiRef!.startCamera()
      queueMicrotask(() => {
        container.querySelector('video')?.dispatchEvent(new Event('loadedmetadata'))
      })
      await camPromise
    })
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(apiRef!.isActive).toBe(true)
  })
})
