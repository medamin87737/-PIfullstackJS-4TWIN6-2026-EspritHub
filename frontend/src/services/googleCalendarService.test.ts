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

})
