import { describe, expect, it } from 'vitest'
import { getLocationAddress, locationToString, parseLocation } from './locationUtils'

describe('locationUtils', () => {
  it('returns defaults when location is missing', () => {
    expect(parseLocation(undefined)).toEqual({
      lat: 36.8065,
      lng: 10.1815,
      address: 'Tunis, Tunisia',
    })
  })

  it('resolves known cities', () => {
    expect(parseLocation('Tunis, Tunisia')).toEqual({
      lat: 36.8065,
      lng: 10.1815,
      address: 'Tunis, Tunisia',
    })
    expect(parseLocation('Paris')).toEqual({
      lat: 48.8566,
      lng: 2.3522,
      address: 'Paris, France',
    })
  })

  it('parses raw coordinates from text', () => {
    expect(parseLocation('36.8, 10.2')).toEqual({
      lat: 36.8,
      lng: 10.2,
      address: '36.8, 10.2',
    })
  })

  it('formats location object to persistent string', () => {
    expect(
      locationToString({ lat: 36.8065, lng: 10.1815, address: 'Tunis, Tunisia' }),
    ).toBe('36.8065,10.1815|Tunis, Tunisia')
    expect(locationToString('Raw location')).toBe('Raw location')
  })

  it('extracts address from encoded location', () => {
    expect(getLocationAddress('36.8065,10.1815|Tunis, Tunisia')).toBe('Tunis, Tunisia')
    expect(getLocationAddress('Paris')).toBe('Paris')
    expect(getLocationAddress(undefined)).toBe('Non spécifié')
  })
})

