import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer(props: { onReady: (ctx: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth()
  props.onReady(ctx)
  return null
}

describe('AuthContext', () => {
  let container: HTMLDivElement
  let root: Root
  const fetchMock = vi.fn()
  let currentCtx: ReturnType<typeof useAuth> | null = null

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
  })

  const renderWithProvider = async () => {
    await act(async () => {
      root.render(
        <AuthProvider>
          <TestConsumer onReady={(ctx) => { currentCtx = ctx }} />
        </AuthProvider>,
      )
    })
  }

  it('loads persisted user from storage and normalizes role', async () => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: '1', name: 'A', role: 'unknown' }),
    )
    await renderWithProvider()
    expect(currentCtx?.user?.role).toBe('EMPLOYEE')
    expect(currentCtx?.isAuthenticated).toBe(true)
  })

  it('login succeeds and stores tokens in chosen storage', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          _id: 'u1',
          name: 'Amin',
          matricule: 'M1',
          telephone: '123',
          email: 'a@b.com',
          date_embauche: '2026-01-01',
          department_id: 'd1',
          manager_id: null,
          status: 'ACTIVE',
          en_ligne: true,
          role: 'HR',
        },
        token: 'tok',
        refresh_token: 'rtok',
      }),
    })

    await renderWithProvider()
    const result = await currentCtx!.login(' A@B.com ', ' pass ', false)
    expect(result.success).toBe(true)
    expect(sessionStorage.getItem('auth_token')).toBe('tok')
    expect(sessionStorage.getItem('auth_refresh_token')).toBe('rtok')
    expect(localStorage.getItem('auth_remember_me')).toBe('false')
    const stored = JSON.parse(sessionStorage.getItem('auth_user') || '{}')
    expect(stored.role).toBe('HR')
  })

  it('login handles backend error payloads and network errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: ['invalid'] }),
    })
    await renderWithProvider()
    await expect(currentCtx!.login('x', 'y')).resolves.toEqual({
      success: false,
      message: 'invalid',
    })

    fetchMock.mockRejectedValueOnce(new Error('network'))
    await expect(currentCtx!.login('x', 'y')).resolves.toMatchObject({
      success: false,
    })
  })

  it('logout clears storages and auth state', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', name: 'A', role: 'ADMIN' }))
    localStorage.setItem('auth_token', 't')
    sessionStorage.setItem('auth_refresh_token', 'r')
    await renderWithProvider()
    act(() => {
      currentCtx!.logout()
    })
    expect(currentCtx?.user).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(sessionStorage.getItem('auth_refresh_token')).toBeNull()
  })
})

