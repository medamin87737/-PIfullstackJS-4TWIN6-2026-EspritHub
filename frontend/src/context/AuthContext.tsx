import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, UserRole, UserStatus } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  hasRole: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizeRole(role: unknown): UserRole {
  const normalized = String(role ?? '').toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'HR' || normalized === 'MANAGER' || normalized === 'EMPLOYEE') {
    return normalized
  }
  return 'EMPLOYEE'
}

function normalizeStoredUser(raw: User): User {
  return {
    ...raw,
    role: normalizeRole(raw.role),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user') ?? sessionStorage.getItem('auth_user')
    return saved ? normalizeStoredUser(JSON.parse(saved)) : null
  })

  const mapBackendStatusToFrontend = (status: string | undefined): UserStatus => {
    switch (status) {
      case 'ACTIVE':
        return 'active'
      case 'INACTIVE':
        return 'inactive'
      case 'SUSPENDED':
        return 'suspended'
      default:
        return 'active'
    }
  }

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe = true,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      })

      if (!response.ok) {
        let message = 'Email ou mot de passe incorrect'
        try {
          const err = await response.json()
          if (typeof err?.message === 'string') {
            message = err.message
          } else if (Array.isArray(err?.message) && err.message.length > 0) {
            message = String(err.message[0])
          }
        } catch {
          // ignore body parsing and keep default message
        }
        return { success: false, message }
      }

      const data = await response.json()
      const backendUser = data.user as any
      const token = data.token as string | undefined
      const refreshToken = data.refresh_token as string | undefined

      if (!backendUser) {
        return { success: false, message: 'Réponse serveur invalide' }
      }

      const mappedUser: User = {
        id: String(backendUser._id ?? backendUser.id ?? ''),
        name: backendUser.name ?? '',
        matricule: backendUser.matricule ?? '',
        telephone: backendUser.telephone ?? '',
        email: backendUser.email ?? email,
        // Never store backend password hash in the frontend
        password: '',
        date_embauche:
          typeof backendUser.date_embauche === 'string'
            ? backendUser.date_embauche
            : backendUser.date_embauche
              ? new Date(backendUser.date_embauche).toISOString()
              : new Date().toISOString(),
        departement_id: backendUser.department_id ? String(backendUser.department_id) : '',
        manager_id: backendUser.manager_id ? String(backendUser.manager_id) : null,
        status: mapBackendStatusToFrontend(backendUser.status),
        en_ligne: backendUser.en_ligne ?? true,
        role: normalizeRole(backendUser.role),
      }

      setUser(mappedUser)
      // Nettoyer les deux storages avant d'écrire la session choisie
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_refresh_token')
      sessionStorage.removeItem('auth_user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_refresh_token')

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('auth_user', JSON.stringify(mappedUser))
      localStorage.setItem('auth_remember_me', rememberMe ? 'true' : 'false')

      if (token) {
        storage.setItem('auth_token', token)
      }
      if (refreshToken) {
        storage.setItem('auth_refresh_token', refreshToken)
      }

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Erreur réseau. Vérifiez que le backend est démarré.' }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_refresh_token')
    localStorage.removeItem('auth_remember_me')
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_refresh_token')
  }, [])

  const hasRole = useCallback((role: UserRole) => normalizeRole(user?.role) === normalizeRole(role), [user])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
