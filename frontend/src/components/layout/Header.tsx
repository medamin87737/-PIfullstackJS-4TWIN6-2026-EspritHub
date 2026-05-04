import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { Bell, Sun, Moon, Award } from 'lucide-react'
import { cn } from '../../../lib/utils'
const WeatherWidget = lazy(() => import('../WeatherWidget'))
const WebsiteGuideAgent = lazy(() => import('./WebsiteGuideAgent'))

function Header() {
  const { user } = useAuth()
  const { getUserNotifications, markNotificationRead, refreshNotifications } = useData()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showDeferredTools, setShowDeferredTools] = useState(false)

  if (!user) return null

  const userNotifications = useMemo(() => getUserNotifications(user.id), [getUserNotifications, user.id])
  const topNotifications = useMemo(() => userNotifications.slice(0, 6), [userNotifications])
  const unreadCount = useMemo(() => userNotifications.filter((n) => !n.read).length, [userNotifications])
  const userInitials = useMemo(() => user.name.split(' ').map((n) => n[0]).join('').slice(0, 2), [user.name])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }, [darkMode])

  const goToNotificationTarget = useCallback((n: { rawType?: string; activity_id?: string; data?: Record<string, any> }) => {
    if (n.rawType === 'CERTIFICATE_ISSUED') {
      navigate('/employee/notifications')
      return
    }
    if (user.role === 'EMPLOYEE') {
      navigate(n.activity_id ? `/employee/activities?activityId=${n.activity_id}` : '/employee/notifications')
      return
    }
    if (user.role === 'MANAGER') {
      const employeeId = n.data?.employeeId ? String(n.data.employeeId) : ''
      if (n.rawType === 'EMPLOYEE_DECLINED') {
        const params = new URLSearchParams()
        if (n.activity_id) params.set('activityId', n.activity_id)
        if (employeeId) params.set('employeeId', employeeId)
        params.set('focus', 'declined')
        navigate(`/manager/validations?${params.toString()}`)
        return
      }
      navigate('/manager/activities')
      return
    }
    if (user.role === 'HR') {
      const employeeId = n.data?.employeeId ? String(n.data.employeeId) : ''
      if (n.activity_id && n.rawType === 'EMPLOYEE_DECLINED' && employeeId) {
        navigate(`/hr/recommendations/${n.activity_id}?focus=declined&employeeId=${encodeURIComponent(employeeId)}`)
        return
      }
      navigate(n.activity_id ? `/hr/recommendations/${n.activity_id}` : '/hr/activities')
      return
    }
    navigate('/admin/dashboard')
  }, [navigate, user.role])

  const handleToggleNotifications = useCallback(() => {
    const next = !showNotifications
    setShowNotifications(next)
    if (next) void refreshNotifications()
  }, [refreshNotifications, showNotifications])

  const closeNotifications = useCallback(() => {
    setShowNotifications(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setShowDeferredTools(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <header className="reveal sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-card/85 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center">
        {showDeferredTools ? (
          <Suspense fallback={<div className="h-9 w-24 rounded-lg border border-border bg-card/50" />}>
            <WeatherWidget collapsed={false} />
          </Suspense>
        ) : (
          <div className="h-9 w-24 rounded-lg border border-border bg-card/50" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {showDeferredTools && (
          <Suspense fallback={null}>
            <WebsiteGuideAgent />
          </Suspense>
        )}

        <button
          onClick={toggleDarkMode}
          className="button-micro flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="button-micro relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeNotifications} />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg animate-fade-in">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-card-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {userNotifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune notification</p>
                  ) : (
                    topNotifications.map((n) => (
                      <button
                        key={n.id}
                        className={cn(
                          'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-all hover:bg-accent',
                          !n.read && 'bg-accent/50',
                          n.rawType === 'CERTIFICATE_ISSUED' && 'bg-amber-50/40 dark:bg-amber-900/10',
                        )}
                        onClick={() => {
                          markNotificationRead(n.id)
                          closeNotifications()
                          goToNotificationTarget(n)
                        }}
                      >
                        {n.rawType === 'CERTIFICATE_ISSUED'
                          ? <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          : <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', !n.read ? 'bg-primary' : 'bg-transparent')} />
                        }
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className={cn(
                            'truncate text-sm font-medium text-card-foreground',
                            n.rawType === 'CERTIFICATE_ISSUED' && 'text-amber-700 dark:text-amber-400',
                          )}>
                            {n.title}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-border px-4 py-2">
                  <button
                    onClick={() => {
                      closeNotifications()
                      navigate(user.role === 'EMPLOYEE' ? '/employee/notifications' : user.role === 'MANAGER' ? '/manager/activities' : '/hr/activities')
                    }}
                    className="w-full text-center text-xs text-primary hover:underline"
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {userInitials}
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-xs font-medium text-card-foreground">{user.name}</span>
            <span className="text-[10px] text-muted-foreground">{user.role}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default memo(Header)
