import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WeatherWidget from './WeatherWidget'

function mkJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() {
      return this
    },
  } as Response
}

function stubFetch(opts?: { forecastOk?: boolean; weatherCode?: number }) {
  const forecastOk = opts?.forecastOk ?? true
  const weatherCode = opts?.weatherCode ?? 0
  return vi.fn((input: RequestInfo | URL) => {
    const href =
      typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)

    if (href.includes('api.open-meteo.com/v1/forecast') && href.includes('current=')) {
      if (!forecastOk) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({}),
          text: async () => '',
          clone() {
            return this
          },
        } as Response)
      }
      return Promise.resolve(
        mkJson({
          current: {
            temperature_2m: 21,
            relative_humidity_2m: 48,
            weather_code: weatherCode,
            wind_speed_10m: 9,
          },
        }),
      )
    }

    if (href.includes('api.open-meteo.com/v1/forecast') && href.includes('daily=')) {
      return Promise.resolve(
        mkJson({
          daily: {
            time: ['2026-05-04', '2026-05-05'],
            weather_code: [1, 71],
            temperature_2m_max: [26, 20],
            temperature_2m_min: [16, 12],
            relative_humidity_2m_mean: [52, 60],
            wind_speed_10m_max: [11, 22],
          },
        }),
      )
    }

    if (href.includes('geocoding-api.open-meteo.com')) {
      return Promise.resolve(
        mkJson({
          results: [
            {
              name: 'Sousse',
              latitude: 35.8256,
              longitude: 10.6411,
              country: 'Tunisie',
              admin1: 'Sousse',
            },
          ],
        }),
      )
    }

    return Promise.resolve(mkJson({}))
  })
}

function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('WeatherWidget and WeatherModal', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('fetch', stubFetch())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads current weather when expanded', async () => {
    await act(async () => {
      root.render(<WeatherWidget collapsed={false} city="Tunis" />)
    })
    await expect.poll(() => container.textContent ?? '').toContain('21°')
    await expect.poll(() => container.textContent ?? '').toContain('Tunis')
  })

  it('uses fallback label for unknown weather codes', async () => {
    vi.stubGlobal('fetch', stubFetch({ weatherCode: 424242 }))
    await act(async () => {
      root.render(<WeatherWidget collapsed={false} />)
    })
    await expect.poll(() => container.textContent ?? '').toContain('°')
  })

  it('shows error UI when forecast request fails', async () => {
    vi.stubGlobal('fetch', stubFetch({ forecastOk: false }))
    await act(async () => {
      root.render(<WeatherWidget collapsed={false} />)
    })
    await expect.poll(() => container.textContent ?? '').toContain('Météo')
  })

  it('collapsed widget opens modal and searches cities', async () => {
    await act(async () => {
      root.render(<WeatherWidget collapsed city="Tunis" />)
    })
    await expect.poll(() => container.querySelector('button')).toBeTruthy()

    const toggle = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      toggle.click()
    })

    await expect.poll(() => document.body.textContent ?? '').toContain('Prévisions 7 jours')

    const searchInput = Array.from(document.querySelectorAll('input')).find((i) =>
      i.getAttribute('placeholder')?.includes('Rechercher'),
    ) as HTMLInputElement | undefined
    expect(searchInput).toBeTruthy()

    await act(async () => {
      setInputValue(searchInput!, 'So')
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450))
    })

    await expect.poll(() => document.body.textContent ?? '').toContain('Sousse')

    const cityChoice = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sousse'),
    )
    await act(async () => cityChoice?.click())

    await expect.poll(() => document.body.textContent ?? '').toContain('26°')

    const forecastDays = Array.from(document.querySelectorAll('button')).filter((b) =>
      /\d+°/.test(b.textContent ?? ''),
    )
    expect(forecastDays.length).toBeGreaterThan(1)
    await act(async () => forecastDays[1]?.click())

    const reduce = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Réduire'),
    )
    await act(async () => reduce?.click())

    await expect.poll(() => document.querySelector('[aria-label="Fermer la modal météo"]')).toBeNull()
  })
})
