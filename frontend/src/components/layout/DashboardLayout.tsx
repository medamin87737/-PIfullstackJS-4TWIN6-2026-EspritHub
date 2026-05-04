import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import AnimatedBackdrop from '../shared/AnimatedBackdrop'
import { useAuth } from '../../context/AuthContext'

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showBackdrop, setShowBackdrop] = useState(false)
  const { user } = useAuth()
  const roleClass = useMemo(
    () => (user?.role ? `role-${String(user.role).toLowerCase()}` : 'role-default'),
    [user?.role],
  )
  const setCollapsedStable = useCallback((nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setShowBackdrop(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className={`role-theme ${roleClass} relative flex min-h-screen bg-background`}>
      {showBackdrop && <AnimatedBackdrop className="opacity-60" />}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsedStable} />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 animate-page-enter ${
          collapsed ? 'ml-[5rem]' : 'ml-[260px]'
        }`}
      >
        <Header />
        <main className="relative z-10 flex-1 p-6 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default memo(DashboardLayout)
