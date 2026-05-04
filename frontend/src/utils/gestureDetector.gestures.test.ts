import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalizedLandmark } from '../types/hand-gesture.types'
import { HandLandmarkIndex } from '../types/hand-gesture.types'
import {
  areFingersClosed,
  detectGesture,
  isFist,
  isOpenHand,
  isThumbsDown,
  isThumbsUp,
} from './gestureDetector'

function mkLandmarks(overrides: Partial<Record<number, NormalizedLandmark>>): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
  Object.entries(overrides).forEach(([k, v]) => {
    landmarks[Number(k)] = v!
  })
  return landmarks
}

describe('gestureDetector gesture classification', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('exposes HandLandmarkIndex enum values', () => {
    expect(HandLandmarkIndex.WRIST).toBe(0)
    expect(HandLandmarkIndex.THUMB_TIP).toBe(4)
    expect(HandLandmarkIndex.MIDDLE_FINGER_MCP).toBe(9)
  })

  it('detectGesture returns UNKNOWN for invalid landmark counts', () => {
    expect(detectGesture([]).gesture).toBe('UNKNOWN')
    expect(detectGesture(mkLandmarks({}).slice(0, 10)).gesture).toBe('UNKNOWN')
  })

  it('areFingersClosed counts folded fingers', () => {
    const landmarks = mkLandmarks({})
    landmarks[9] = { x: 0.5, y: 0.6, z: 0 }
    landmarks[0] = { x: 0.5, y: 0.85, z: 0 }
    // Tips close to MCPs -> closed
    for (const mcp of [5, 9, 13, 17]) {
      landmarks[mcp + 3] = { ...landmarks[mcp], x: landmarks[mcp].x + 0.02, y: landmarks[mcp].y + 0.02 }
    }
    expect(areFingersClosed([5, 9, 13, 17], landmarks)).toBe(true)
  })

  it('detects THUMBS_UP when thumb extended up and others closed', () => {
    const landmarks = mkLandmarks({})
    landmarks[0] = { x: 0.5, y: 0.85, z: 0 }
    landmarks[9] = { x: 0.5, y: 0.62, z: 0 }
    landmarks[2] = { x: 0.48, y: 0.72, z: 0 }
    landmarks[3] = { x: 0.49, y: 0.62, z: 0 }
    landmarks[4] = { x: 0.5, y: 0.52, z: 0 }
    for (const mcp of [5, 9, 13, 17]) {
      landmarks[mcp + 3] = { x: landmarks[mcp].x + 0.02, y: landmarks[mcp].y + 0.02, z: 0 }
    }
    expect(isThumbsUp(landmarks)).toBe(true)
    expect(detectGesture(landmarks).gesture).toBe('THUMBS_UP')
  })

  it('detects THUMBS_DOWN orientation branch and OPEN_HAND / FIST', () => {
    const landmarks = mkLandmarks({})
    landmarks[0] = { x: 0.5, y: 0.5, z: 0 }
    landmarks[9] = { x: 0.5, y: 0.65, z: 0 }
    landmarks[2] = { x: 0.48, y: 0.52, z: 0 }
    landmarks[3] = { x: 0.49, y: 0.58, z: 0 }
    landmarks[4] = { x: 0.5, y: 0.66, z: 0 }
    for (const mcp of [5, 9, 13, 17]) {
      landmarks[mcp + 3] = { x: landmarks[mcp].x + 0.02, y: landmarks[mcp].y + 0.02, z: 0 }
    }
    expect(isThumbsDown(landmarks)).toBe(true)

    const open = mkLandmarks({})
    open[0] = { x: 0.5, y: 0.85, z: 0 }
    open[9] = { x: 0.5, y: 0.6, z: 0 }
    open[5] = { x: 0.42, y: 0.62, z: 0 }
    open[8] = { x: 0.42, y: 0.35, z: 0 }
    open[12] = { x: 0.5, y: 0.32, z: 0 }
    open[16] = { x: 0.58, y: 0.33, z: 0 }
    open[20] = { x: 0.62, y: 0.38, z: 0 }
    for (const mcp of [9, 13, 17]) {
      open[mcp] = { x: 0.5 + (mcp - 9) * 0.04, y: 0.62, z: 0 }
    }
    open[9] = { x: 0.5, y: 0.62, z: 0 }
    expect(isOpenHand(open)).toBe(true)

    const fist = mkLandmarks({})
    fist[0] = { x: 0.5, y: 0.82, z: 0 }
    fist[9] = { x: 0.5, y: 0.58, z: 0 }
    for (const [mcp, tip] of [[5, 8], [9, 12], [13, 16], [17, 20]] as const) {
      fist[mcp] = { x: 0.5, y: 0.6, z: 0 }
      fist[tip] = { x: 0.52, y: 0.58, z: 0 }
    }
    expect(isFist(fist)).toBe(true)
  })
})
