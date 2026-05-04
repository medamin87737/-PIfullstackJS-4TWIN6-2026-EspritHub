import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Chatbot } from './Chatbot'
import AppLoader from './shared/AppLoader'
import AnimatedBackdrop from './shared/AnimatedBackdrop'
import StatCard from './shared/StatCard'
import StatusBadge from './shared/StatusBadge'
import DataTable from './shared/DataTable'
import { AuthProvider } from '../context/AuthContext'
import { DataProvider } from '../context/DataContext'
import ProtectedRoute from './auth/ProtectedRoute'
import RealtimeNotifications from './shared/RealtimeNotifications'

vi.mock('../services/chatService', () => ({
  chatService: {
    sendMessage: vi.fn().mockResolvedValue({
      reply: 'Reponse test',
      timestamp: new Date().toISOString(),
    }),
  },
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
    connected: false,
  })),
}))

describe('components smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn() as typeof Element.prototype.scrollIntoView
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'x')
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'y')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
          text: async () => '[]',
          clone() {
            return this
          },
        } as Response),
      ),
    )
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: '1',
        name: 'U',
        matricule: 'M',
        telephone: '',
        email: 'e@e.com',
        password: '',
        date_embauche: new Date().toISOString(),
        departement_id: '',
        manager_id: null,
        status: 'active',
        en_ligne: true,
        role: 'EMPLOYEE',
      }),
    )
    localStorage.setItem('auth_token', 't')
    localStorage.setItem('auth_remember_me', 'true')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders Chatbot', async () => {
    await act(async () => {
      root.render(<Chatbot activityId="act-1" onClose={() => {}} />)
    })
    expect(container.textContent).toBeTruthy()
  })

  it('renders shared UI primitives', async () => {
    await act(async () => {
      root.render(
        <>
          <AppLoader />
          <AnimatedBackdrop className="test" />
          <StatCard title="T" value={1} icon={<span aria-hidden>i</span>} trend={{ value: 2, label: 'lab' }} />
          <StatusBadge status="active" />
          <DataTable columns={[{ key: 'a', header: 'A' }]} data={[{ id: '1', a: 'x' }]} />
        </>,
      )
    })
    expect(container.innerHTML.length).toBeGreaterThan(10)
  })

  it('renders GoogleCalendarConnect', async () => {
    const { GoogleCalendarConnect } = await import('./GoogleCalendarConnect')
    await act(async () => {
      root.render(<GoogleCalendarConnect />)
    })
    expect(container.textContent).toBeTruthy()
  })

  it('renders RealtimeNotifications inside auth + data', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <DataProvider>
              <RealtimeNotifications />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>,
      )
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(container).toBeTruthy()
  })

  it('renders ProtectedRoute branch', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/x']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/x"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                    <div>inside</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('inside')
  })
})
