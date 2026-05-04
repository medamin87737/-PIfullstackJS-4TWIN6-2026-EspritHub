import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../context/AuthContext'
import WebsiteGuideAgent from './WebsiteGuideAgent'

vi.mock('../../api/chat', () => ({
  askWebsiteGuide: vi.fn().mockResolvedValue({
    reply: 'Voici une reponse guide /hr/dashboard et https://example.com',
    timestamp: new Date().toISOString(),
  }),
}))

describe('WebsiteGuideAgent', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: '1',
        name: 'Test',
        matricule: 'M',
        telephone: '',
        email: 't@t.com',
        password: '',
        date_embauche: new Date().toISOString(),
        departement_id: '',
        manager_id: null,
        status: 'active',
        en_ligne: true,
        role: 'HR',
      }),
    )
    localStorage.setItem('auth_token', 'tok')
    localStorage.setItem('auth_remember_me', 'true')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    vi.clearAllMocks()
  })

  it('opens panel, sends prompt, renders links', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/hr/dashboard']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/hr/dashboard"
                element={
                  <div>
                    <WebsiteGuideAgent />
                  </div>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      )
    })

    const toggle = container.querySelector('button[aria-label="Ouvrir AgentWebsite"]')
    expect(toggle).toBeTruthy()
    await act(async () => {
      ;(toggle as HTMLButtonElement).click()
    })

    const chip = container.querySelector('.agent-website-chip') as HTMLButtonElement | null
    expect(chip).toBeTruthy()
    await act(async () => {
      chip!.click()
    })

    await expect
      .poll(() => container.textContent ?? '', { timeout: 10_000 })
      .toContain('Voici une reponse guide')
  })
})
