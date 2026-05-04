import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GestureValidator } from './gestureValidator'

describe('GestureValidator', () => {
  let validator: GestureValidator
  let now = 0

  beforeEach(() => {
    now = 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    validator = new GestureValidator()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts validation with progress 0', () => {
    const result = validator.update('THUMBS_UP')
    expect(result.isValidated).toBe(false)
    expect(result.progress).toBe(0)
    expect(validator.getCurrentGesture()).toBe('THUMBS_UP')
  })

  it('validates gesture after stability duration then enters cooldown', () => {
    validator.update('THUMBS_UP')
    now += 1000
    const result = validator.update('THUMBS_UP')
    expect(result.isValidated).toBe(true)
    expect(validator.isInCooldown()).toBe(true)
    expect(validator.getCooldownRemaining()).toBeGreaterThan(0)
  })

  it('returns unstable when gesture changes too many times', () => {
    expect(validator.update('THUMBS_UP').isUnstable).toBe(false)
    now += 100
    expect(validator.update('THUMBS_DOWN').isUnstable).toBe(false)
    now += 100
    expect(validator.update('OPEN_HAND').isUnstable).toBe(false)
    now += 100
    const unstable = validator.update('FIST')
    expect(unstable.isUnstable).toBe(true)
    expect(validator.getGestureChangeCount()).toBe(4)
  })

  it('resets internal state', () => {
    validator.update('THUMBS_UP')
    validator.reset()
    expect(validator.getCurrentGesture()).toBe(null)
    expect(validator.isInCooldown()).toBe(false)
    expect(validator.getGestureChangeCount()).toBe(0)
  })
})

