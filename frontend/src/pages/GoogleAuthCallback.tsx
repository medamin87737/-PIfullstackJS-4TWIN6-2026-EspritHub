import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserRole } from '../types'

const roleRoutes: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  HR: '/hr/dashboard',
  MANAGER: '/manager/dashboard',
  EMPLOYEE: '/employee/dashboard',
}

export default function GoogleAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const refreshToken = params.get('refresh_token')
    const userRaw = params.get('user')

    if (!token || !userRaw) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(userRaw)
      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('auth_token', token)
      if (refreshToken) localStorage.setItem('auth_refresh_token', refreshToken)
      localStorage.setItem('auth_remember_me', 'true')
      const role = user?.role as UserRole | undefined
      navigate(role ? roleRoutes[role] ?? '/login' : '/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return <div className="p-8 text-sm text-muted-foreground">Connexion Google en cours...</div>
}
