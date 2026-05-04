import { describe, expect, it, vi } from 'vitest'
import { clearCanvas, renderHand, resizeCanvas } from './canvasRenderer'

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
}

function mkLandmarks() {
  return Array.from({ length: 21 }, (_, i) => ({
    x: (i % 5) / 5,
    y: (i % 7) / 7,
    z: 0,
  }))
}

describe('canvasRenderer', () => {
  it('returns early when 2d context is unavailable', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHand(canvas, mkLandmarks())
    expect(spy).toHaveBeenCalled()
  })

  it('returns early with invalid landmark count', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(createMockCtx())
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderHand(canvas, [{ x: 0, y: 0, z: 0 }])
    expect(spy).toHaveBeenCalled()
  })

  it('draws connections and landmarks with defaults', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 80
    const ctx = createMockCtx()
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx)

    renderHand(canvas, mkLandmarks())

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 80)
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('supports disabling connections and landmarks', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = createMockCtx()
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx)

    renderHand(canvas, mkLandmarks(), { drawConnections: false, drawLandmarks: false })
    expect(ctx.moveTo).not.toHaveBeenCalled()
    expect(ctx.arc).not.toHaveBeenCalled()
  })

  it('resizes canvas based on video dimensions', () => {
    const canvas = document.createElement('canvas')
    const video = document.createElement('video')
    Object.defineProperty(video, 'videoWidth', { value: 640 })
    Object.defineProperty(video, 'videoHeight', { value: 360 })
    Object.defineProperty(video, 'clientWidth', { value: 320 })
    Object.defineProperty(video, 'clientHeight', { value: 180 })

    resizeCanvas(canvas, video)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(canvas.style.width).toBe('320px')
    expect(canvas.style.height).toBe('180px')
  })

  it('clearCanvas clears when context exists', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 25
    canvas.height = 40
    const ctx = createMockCtx()
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx)
    clearCanvas(canvas)
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 25, 40)
  })
})

