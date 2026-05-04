import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider, useData } from './DataContext'

const mockedAuthUser = { id: 'u1', role: 'HR' }
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: mockedAuthUser,
  }),
}))

const toastSpy = vi.fn()
vi.mock('../../hooks/use-toast', () => ({
  toast: (args: unknown) => toastSpy(args),
}))

function Consumer(props: { onReady: (ctx: ReturnType<typeof useData>) => void }) {
  const ctx = useData()
  props.onReady(ctx)
  return null
}

function mkResponse(status: number, payload: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    clone() {
      return this
    },
  } as Response
}

describe('DataContext', () => {
  let container: HTMLDivElement
  let root: Root
  const fetchMock = vi.fn()
  let ctxRef: ReturnType<typeof useData> | null = null

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      const href = String(url)
      if (href.includes('/users/refresh')) return mkResponse(200, { token: 'new-token' })
      return mkResponse(200, [])
    })
    toastSpy.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('auth_token', 'tok')
    localStorage.setItem('auth_remember_me', 'true')
    if (globalThis.crypto?.randomUUID) {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-1')
    }

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) root.unmount()
    if (container) container.remove()
    vi.restoreAllMocks()
  })

  const renderProvider = async () => {
    await act(async () => {
      root.render(
        <DataProvider>
          <Consumer onReady={(ctx) => { ctxRef = ctx }} />
        </DataProvider>,
      )
    })
  }

  it('loads initial data and notifications', async () => {
    await renderProvider()
    expect(ctxRef).not.toBeNull()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('fetchWithAuth adds authorization and handles mutation toasts', async () => {
    await renderProvider()
    fetchMock.mockResolvedValueOnce(mkResponse(200, { ok: true }))
    const res = await ctxRef!.fetchWithAuth('http://x/test', { method: 'POST' })
    expect(res.ok).toBe(true)
    expect(toastSpy).toHaveBeenCalled()
  })

  it('fetchWithAuth refreshes token on 401 and retries', async () => {
    await renderProvider()
    localStorage.setItem('auth_refresh_token', 'rtok')
    fetchMock
      .mockResolvedValueOnce(mkResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(mkResponse(200, { token: 'new-token' }))
      .mockResolvedValueOnce(mkResponse(200, { ok: true }))

    const res = await ctxRef!.fetchWithAuth('http://x/protected')
    expect(res.ok).toBe(true)
    expect(localStorage.getItem('auth_token')).toBe('new-token')
  })

  it('helpers update local state', async () => {
    await renderProvider()
    act(() => {
      ctxRef!.addActivity({
        id: 'a1',
        title: 'Act',
        description: 'Desc',
        type: 'training',
        required_skills: [],
        seats: 10,
        date: new Date().toISOString(),
        duration: '1d',
        location: 'Tunis',
        priority: 'high',
        status: 'open',
        created_by: 'HR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      ctxRef!.sendNotification('u1', 'a1', 't', 'm', 'general')
    })
    expect(ctxRef!.getUnreadCount('u1')).toBe(1)
    expect(ctxRef!.getUserNotifications('u1').length).toBe(1)
    expect(ctxRef!.getActivityRecommendations('a1')).toEqual([])
  })
})

