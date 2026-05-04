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
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001' as ReturnType<Crypto['randomUUID']>,
    )

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
        priority: 'consolidate_medium',
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

  it('fetchWithAuth retries on 403 with renewed token', async () => {
    await renderProvider()
    localStorage.setItem('auth_token', 'old')
    localStorage.setItem('auth_refresh_token', 'r')
    fetchMock
      .mockResolvedValueOnce(mkResponse(403, {}))
      .mockResolvedValueOnce(mkResponse(200, { token: 't2' }))
      .mockResolvedValueOnce(mkResponse(200, { ok: true }))
    const res = await ctxRef!.fetchWithAuth('http://x/ok')
    expect(res.ok).toBe(true)
  })

  it('fetchWithAuth surfaces network failure', async () => {
    await renderProvider()
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(ctxRef!.fetchWithAuth('http://x')).rejects.toThrow('Connexion au serveur impossible')
    expect(toastSpy).toHaveBeenCalled()
  })

  it('fetchWithAuth shows mutation error with array message', async () => {
    await renderProvider()
    fetchMock.mockResolvedValueOnce(mkResponse(400, { message: ['Première erreur'] }))
    await ctxRef!.fetchWithAuth('http://x', { method: 'POST' })
    const last = toastSpy.mock.calls.at(-1)?.[0] as { description?: string }
    expect(last?.description).toContain('Première erreur')
  })

  it('fetchWithAuth shows read error on failed GET', async () => {
    await renderProvider()
    fetchMock.mockResolvedValueOnce(mkResponse(500, { message: 'srv' }))
    await ctxRef!.fetchWithAuth('http://x/read')
    expect(toastSpy.mock.calls.some((c) => String((c[0] as any)?.title).includes('chargement'))).toBe(true)
  })

  it('fetchWithAuth skips network toast when x-toast-silent', async () => {
    const before = toastSpy.mock.calls.length
    await renderProvider()
    fetchMock.mockRejectedValueOnce(new Error('x'))
    await expect(
      ctxRef!.fetchWithAuth('http://x', { headers: { 'x-toast-silent': 'true' } }),
    ).rejects.toThrow()
    expect(toastSpy.mock.calls.length).toBe(before)
  })

  it('refreshNotifications clears list on HTTP error', async () => {
    await renderProvider()
    fetchMock.mockResolvedValueOnce(mkResponse(500, {}))
    await act(async () => {
      await ctxRef!.refreshNotifications()
    })
    expect(ctxRef!.notifications).toEqual([])
  })

  it('getDepartmentName returns N/A for empty id', async () => {
    await renderProvider()
    expect(ctxRef!.getDepartmentName('')).toBe('N/A')
  })

  it('updateActivity and deleteActivity mutate activities', async () => {
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
        priority: 'consolidate_medium',
        status: 'open',
        created_by: 'HR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })
    act(() => {
      ctxRef!.updateActivity({
        id: 'a1',
        title: 'Act2',
        description: 'Desc',
        type: 'training',
        required_skills: [],
        seats: 10,
        date: new Date().toISOString(),
        duration: '1d',
        location: 'Tunis',
        priority: 'consolidate_medium',
        status: 'open',
        created_by: 'HR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })
    expect(ctxRef!.activities.find((a) => a.id === 'a1')?.title).toBe('Act2')
    act(() => {
      ctxRef!.deleteActivity('a1')
    })
    expect(ctxRef!.activities.find((a) => a.id === 'a1')).toBeUndefined()
  })

  it('importUsersFromCsv merges created users', async () => {
    await renderProvider()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150))
    })
    fetchMock.mockResolvedValueOnce(
      mkResponse(200, {
        created: [
          {
            _id: 'imp1',
            name: 'Imported',
            matricule: 'M99',
            email: 'i@i.com',
            telephone: '',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            department_id: null,
            manager_id: null,
            date_embauche: new Date().toISOString(),
          },
        ],
        message: 'OK',
        createdCount: 1,
        errorCount: 0,
      }),
    )
    const file = new File(['a,b'], 'u.csv', { type: 'text/csv' })
    const out = await ctxRef!.importUsersFromCsv(file)
    expect(out.createdCount).toBe(1)
    expect(out.message).toBe('OK')
  })

  it('markNotificationRead patches server and updates state', async () => {
    await renderProvider()
    act(() => {
      ctxRef!.sendNotification('u1', undefined, 't', 'm', 'general')
    })
    const id = ctxRef!.getUserNotifications('u1')[0]!.id
    fetchMock.mockResolvedValueOnce(mkResponse(200, {}))
    await act(async () => {
      ctxRef!.markNotificationRead(id)
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(ctxRef!.getUnreadCount('u1')).toBe(0)
  })
})

