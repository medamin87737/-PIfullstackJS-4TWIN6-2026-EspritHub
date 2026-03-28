import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import {
  LayoutDashboard, Users, Building2, Brain, FileQuestion,
  ClipboardList, Sparkles, History, UserCircle, Bell,
  ChevronLeft, ChevronRight, LogOut, BarChart3,
  FolderOpen
} from 'lucide-react'
import { cn } from '../../../lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const roleNavItems: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Utilisateurs', path: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { label: 'Departements', path: '/admin/departments', icon: <Building2 className="h-5 w-5" /> },
    { label: 'Competences', path: '/admin/skills', icon: <Brain className="h-5 w-5" /> },
    { label: 'Questions', path: '/admin/questions', icon: <FileQuestion className="h-5 w-5" /> },
    { label: 'Analytiques', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  ],
  HR: [
    { label: 'Dashboard', path: '/hr/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Activites', path: '/hr/activities', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Import CSV Employes', path: '/hr/import-employees', icon: <Users className="h-5 w-5" /> },
    { label: 'Demandes Managers', path: '/hr/activity-requests', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Historique', path: '/hr/history', icon: <History className="h-5 w-5" /> },
    { label: 'Analytiques', path: '/hr/analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Reformulation', path: '/hr/prompt-rewriter', icon: <Sparkles className="h-5 w-5" /> },
  ],
  MANAGER: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Activites', path: '/manager/activities', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Demander Activite', path: '/manager/activity-requests', icon: <FolderOpen className="h-5 w-5" /> },
    { label: 'Historique', path: '/manager/history', icon: <History className="h-5 w-5" /> },
  ],
  EMPLOYEE: [
    { label: 'Dashboard', path: '/employee/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Mes Activites', path: '/employee/activities', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Notifications', path: '/employee/notifications', icon: <Bell className="h-5 w-5" /> },
    { label: 'Evolution Competences', path: '/employee/skill-updates', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Historique', path: '/employee/history', icon: <History className="h-5 w-5" /> },
    { label: 'Mon Profil', path: '/employee/profile', icon: <UserCircle className="h-5 w-5" /> },
  ],
}

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (!user) return null

  const navItems = (roleNavItems[user.role] ?? []).map((item) => {
    // Map labels to i18n keys when possible
    if (user.role === 'ADMIN') {
      if (item.path.endsWith('/dashboard')) return { ...item, label: t('sidebar.admin.dashboard') }
      if (item.path.endsWith('/users')) return { ...item, label: t('sidebar.admin.users') }
      if (item.path.endsWith('/departments')) return { ...item, label: t('sidebar.admin.departments') }
      if (item.path.endsWith('/skills')) return { ...item, label: t('sidebar.admin.skills') }
      if (item.path.endsWith('/questions')) return { ...item, label: t('sidebar.admin.questions') }
      if (item.path.endsWith('/analytics')) return { ...item, label: t('sidebar.admin.analytics') }
      if (item.path.endsWith('/prompt-rewriter')) return { ...item, label: t('sidebar.admin.promptRewriter') }
    }
    if (user.role === 'HR') {
      if (item.path.endsWith('/dashboard')) return { ...item, label: t('sidebar.hr.dashboard') }
      if (item.path.endsWith('/activities')) return { ...item, label: t('sidebar.hr.activities') }
      if (item.path.endsWith('/create-activity')) return { ...item, label: t('sidebar.hr.createActivity') }
      if (item.path.endsWith('/history')) return { ...item, label: t('sidebar.hr.history') }
      if (item.path.endsWith('/analytics')) return { ...item, label: t('sidebar.hr.analytics') }
      if (item.path.endsWith('/prompt-rewriter')) return { ...item, label: t('sidebar.hr.promptRewriter') }
    }
    if (user.role === 'MANAGER') {
      if (item.path.endsWith('/dashboard')) return { ...item, label: t('sidebar.manager.dashboard') }
      if (item.path.endsWith('/activities')) return { ...item, label: t('sidebar.manager.activities') }
      if (item.path.endsWith('/validations')) return { ...item, label: t('sidebar.manager.validations') }
      if (item.path.endsWith('/history')) return { ...item, label: t('sidebar.manager.history') }
    }
    if (user.role === 'EMPLOYEE') {
      if (item.path.endsWith('/dashboard')) return { ...item, label: t('sidebar.employee.dashboard') }
      if (item.path.endsWith('/activities')) return { ...item, label: t('sidebar.employee.activities') }
      if (item.path.endsWith('/notifications')) return { ...item, label: t('sidebar.employee.notifications') }
      if (item.path.endsWith('/history')) return { ...item, label: t('sidebar.employee.history') }
      if (item.path.endsWith('/profile')) return { ...item, label: t('sidebar.employee.profile') }
    }
    return item
  })

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setTimeout(() => {
      logout()
      setIsLoggingOut(false)
    }, 1200)
  }

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center backdrop-blur-md bg-background/40 animate-fade-in">
          <div className="loader-panel flex flex-col items-center gap-3 px-6 py-5">
            <div className="loader-pulse-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="loader-bars" aria-hidden="true">
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
              <span className="bar bar-4" />
            </div>
            <p className="text-xs font-medium tracking-[0.22em] text-shimmer">SIGNING OUT</p>
          </div>
        </div>
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-sans text-lg font-bold text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="13 3 7 14 11 14 9 21 17 9 13 9 15 3" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold tracking-wide text-sidebar-primary">
              {t('app.name')}
            </span>
            <span className="truncate text-[10px] text-sidebar-foreground/60">
              {t('sidebar.logoSubtitle')}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="user-avatar-dynamic flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">{user.role}</span>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="rounded-lg p-1.5 text-sidebar-foreground/60 transition-all hover:-translate-y-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Deconnexion">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
      </aside>
    </>
  )
}
