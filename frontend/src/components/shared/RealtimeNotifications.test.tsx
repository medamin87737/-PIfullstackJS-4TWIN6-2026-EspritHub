import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataProvider } from '../../context/DataContext'
import RealtimeNotifications from './RealtimeNotifications'

const handlers: Record<string, ((payload: unknown) => void)[]> = {}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: (ev: string, fn: (p: unknown) => void) => {
      handlers[ev] = handlers[ev] ?? []
      handlers[ev].push(fn)
    },
    disconnect: vi.fn(),
  })),
}))

const mockedUser = { id: 'user-1', role: 'HR' as const }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockedUser }),
}))

const toastFn = vi.fn()
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

describe('RealtimeNotifications', () => {
  let container: HTMLDivElement
  let root: Root
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      const href = String(url)
      if (href.includes('/users/refresh')) {
        return { ok: true, status: 200, json: async () => ({ token: 't' }) } as Response
      }
      if (href.includes('unread-count')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ unread: 2 }),
          text: async () => '{}',
          clone() {
            return this
          },
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]',
        clone() {
          return this
        },
      } as Response
    })
    localStorage.setItem('auth_token', 'tok')
    localStorage.setItem('auth_remember_me', 'true')
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001' as ReturnType<Crypto['randomUUID']>,
    )
    Object.keys(handlers).forEach((k) => delete handlers[k])
    toastFn.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.stubGlobal(
      'requestIdleCallback',
      (cb: () => void) => {
        queueMicrotask(cb)
        return 1
      },
    )
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('registers socket handlers and shows toasts on events', async () => {
    vi.useFakeTimers()
    await act(async () => {
      root.render(
        <DataProvider>
          <RealtimeNotifications />
        </DataProvider>,
      )
    })

    await act(async () => {
      vi.advanceTimersByTime(1300)
    })

    const emit = (ev: string, payload: unknown) => {
      for (const fn of handlers[ev] ?? []) fn(payload)
    }

    await act(async () => {
      emit('notification_created', { title: 'T1', message: 'M1' })
      emit('recommendation_ready', { message: 'Done' })
      emit('manager_review_required', { activityTitle: 'Act' })
      emit('activity_invitation', { message: 'Inv' })
      emit('employee_response', { employeeName: 'E', status: 'OK' })
      emit('employee_response', { employeeName: 'E', status: 'DECLINED' })
    })

    await act(async () => {
      vi.advanceTimersByTime(7000)
    })

    expect(toastFn.mock.calls.length).toBeGreaterThanOrEqual(5)
    vi.useRealTimers()
  })

  it('uses setTimeout path when requestIdleCallback is missing', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'requestIdleCallback',
      undefined as unknown as typeof requestIdleCallback,
    )
    vi.useFakeTimers()
    await act(async () => {
      root.render(
        <DataProvider>
          <RealtimeNotifications />
        </DataProvider>,
      )
    })
    await act(async () => {
      vi.advanceTimersByTime(1300)
    })
    expect(Object.keys(handlers).length).toBeGreaterThan(0)
    vi.useRealTimers()
  })
})
