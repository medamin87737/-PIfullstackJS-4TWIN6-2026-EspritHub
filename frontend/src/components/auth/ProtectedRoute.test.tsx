import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

const auth = {
  isAuthenticated: false as boolean,
  user: null as null | { id: string; role: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' },
}

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => auth,
}))

describe('ProtectedRoute', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('redirects to login when not authenticated', async () => {
    auth.isAuthenticated = false
    auth.user = null
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/secret']}>
          <Routes>
            <Route
              path="/secret"
              element={
                <ProtectedRoute>
                  <div data-testid="child">inside</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>login-page</div>} />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('login-page')
  })

  it('renders children when authenticated and role allowed', async () => {
    auth.isAuthenticated = true
    auth.user = { id: '1', role: 'HR' }
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/hr']}>
          <Routes>
            <Route
              path="/hr"
              element={
                <ProtectedRoute allowedRoles={['HR']}>
                  <div>hr-content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('hr-content')
  })

  it('redirects to role dashboard when role not allowed', async () => {
    auth.isAuthenticated = true
    auth.user = { id: '1', role: 'EMPLOYEE' }
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <div>admin</div>
                </ProtectedRoute>
              }
            />
            <Route path="/employee/dashboard" element={<div>emp-dash</div>} />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('emp-dash')
  })
})
