import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the user's own dashboard
    const roleRoutes: Record<UserRole, string> = {
      ADMIN: '/admin/dashboard',
      HR: '/hr/dashboard',
      MANAGER: '/manager/dashboard',
      EMPLOYEE: '/employee/dashboard',
    }
    return <Navigate to={roleRoutes[user.role]} replace />
  }

  return <>{children}</>
}
