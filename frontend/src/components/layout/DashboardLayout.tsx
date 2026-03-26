import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import AnimatedBackdrop from '../shared/AnimatedBackdrop'
import { useAuth } from '../../context/AuthContext'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const roleClass = user?.role ? `role-${String(user.role).toLowerCase()}` : 'role-default'

  return (
    <div className={`role-theme ${roleClass} relative flex min-h-screen bg-background`}>
      <AnimatedBackdrop className="opacity-60" />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
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
