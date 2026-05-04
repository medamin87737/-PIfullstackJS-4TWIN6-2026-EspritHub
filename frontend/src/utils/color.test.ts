import { describe, expect, it } from 'vitest'
import { hexToHsl } from './color'

describe('hexToHsl', () => {
  it('converts full hex values', () => {
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 })
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 })
  })

  it('converts short hex values and trims input', () => {
    expect(hexToHsl(' #0f0 ')).toEqual({ h: 120, s: 100, l: 50 })
    expect(hexToHsl('#00f')).toEqual({ h: 240, s: 100, l: 50 })
  })
})

