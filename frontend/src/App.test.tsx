import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('App', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', 'false')
    vi.stubEnv('MODE', 'production')
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const href =
          typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
        if (href.includes('open-meteo.com')) {
          return Promise.resolve(
            mkJson({
              current: {
                temperature_2m: 20,
                relative_humidity_2m: 50,
                weather_code: 0,
                wind_speed_10m: 10,
              },
            }),
          )
        }
        return Promise.resolve(mkJson([]))
      }),
    )
    localStorage.clear()
    sessionStorage.clear()
    Element.prototype.scrollIntoView = vi.fn() as typeof Element.prototype.scrollIntoView
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it(
    'boots the application shell',
    async () => {
    const { default: App } = await import('./App')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<App />)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900))
    })
    expect(container.innerHTML.length).toBeGreaterThan(20)
    root.unmount()
    container.remove()
    },
    20_000,
  )
})
