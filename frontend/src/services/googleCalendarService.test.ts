import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('googleCalendarService', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    localStorage.clear()
    delete (window as unknown as { gapi?: unknown }).gapi
    delete (window as unknown as { google?: unknown }).google
    vi.restoreAllMocks()
  })

  it('returns false helpers when Google env is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    vi.stubEnv('VITE_GOOGLE_API_KEY', '')
    const mod = await import('./googleCalendarService')
    expect(mod.isGoogleConnected()).toBe(false)
    expect(mod.getGoogleConnectionStatus().connected).toBe(false)
    expect(await mod.requestGoogleAuth()).toBe(false)
    expect(
      await mod.addActivityToCalendar({
        title: 'T',
        description: 'D',
        startDate: new Date().toISOString(),
      }),
    ).toBe(false)
  })

  it('detects stored token expiry for connection helpers', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cid')
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'key')
    localStorage.setItem('google_access_token', 'tok')
    localStorage.setItem('google_token_expiry', String(Date.now() + 60_000))
    localStorage.setItem('google_user_email', 'u@test.local')
    const mod = await import('./googleCalendarService')
    expect(mod.isGoogleConnected()).toBe(true)
    expect(mod.getGoogleConnectionStatus().email).toBe('u@test.local')

    ;(window as unknown as { google: { accounts: { oauth2: { revoke: (t: string) => void } } } }).google =
      {
        accounts: {
          oauth2: {
            revoke: vi.fn(),
          },
        },
      }
    mod.disconnectGoogle()
    expect(localStorage.getItem('google_access_token')).toBeNull()
  })

  it('initializes APIs and completes requestGoogleAuth via token callback', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cid')
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'key')
    localStorage.clear()

    const tokenClientStub = {
      callback: null as null | ((r: { access_token?: string; expires_in?: number; error?: string }) => void),
      requestAccessToken: vi.fn(function requestAccessToken(this: typeof tokenClientStub) {
        queueMicrotask(() => {
          this.callback?.({ access_token: 'newtok', expires_in: 3600 })
        })
      }),
    }

    const origAppend = document.head.appendChild.bind(document.head)
    vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      if (node instanceof HTMLScriptElement) {
        const src = node.src
        queueMicrotask(() => {
          if (src.includes('apis.google.com')) {
            ;(window as unknown as { gapi: { load: (n: string, cb: () => void) => void; client: { init: ReturnType<typeof vi.fn>; setToken: ReturnType<typeof vi.fn> } } }).gapi =
              {
                load: (_n: string, cb: () => void) => {
                  queueMicrotask(cb)
                },
                client: {
                  init: vi.fn().mockResolvedValue(undefined),
                  setToken: vi.fn(),
                },
              }
          }
          if (src.includes('accounts.google.com')) {
            ;(window as unknown as { google: { accounts: { oauth2: { initTokenClient: ReturnType<typeof vi.fn> } } } }).google =
              {
                accounts: {
                  oauth2: {
                    initTokenClient: vi.fn(() => tokenClientStub),
                  },
                },
              }
          }
          node.onload?.(new Event('load') as never)
        })
        return node
      }
      return origAppend(node)
    })

    const mod = await import('./googleCalendarService')
    await mod.initGoogleCalendar()
    const ok = await mod.requestGoogleAuth()
    expect(ok).toBe(true)
    expect(localStorage.getItem('google_access_token')).toBe('newtok')

    ;(window as unknown as { gapi: { client: { request: ReturnType<typeof vi.fn> } } }).gapi.client.request = vi
      .fn()
      .mockResolvedValue({ result: { id: 'ev1' } })
    const added = await mod.addActivityToCalendar({
      title: 'Act',
      description: 'Desc',
      startDate: new Date().toISOString(),
    })
    expect(added).toBe(true)

    const badDate = await mod.addActivityToCalendar({
      title: 'Act',
      description: 'Desc',
      startDate: 'not-a-date',
    })
    expect(badDate).toBe(false)
  })
})
