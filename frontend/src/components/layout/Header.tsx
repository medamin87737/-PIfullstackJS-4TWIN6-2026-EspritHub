import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { Bell, Sun, Moon, Award } from 'lucide-react'
import { cn } from '../../../lib/utils'
import WeatherWidget from '../WeatherWidget'

export default function Header() {
  const { user } = useAuth()
  const { getUserNotifications, markNotificationRead, refreshNotifications } = useData()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  if (!user) return null

  const userNotifications = getUserNotifications(user.id)
  const unreadCount = userNotifications.filter(n => !n.read).length

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const goToNotificationTarget = (n: { rawType?: string; activity_id?: string }) => {
    if (n.rawType === 'CERTIFICATE_ISSUED') {
      navigate('/employee/notifications')
      return
    }
    if (user.role === 'EMPLOYEE') {
      navigate(n.activity_id ? `/employee/activities?activityId=${n.activity_id}` : '/employee/notifications')
      return
    }
    if (user.role === 'MANAGER') {
      navigate('/manager/activities')
      return
    }
    if (user.role === 'HR') {
      navigate(n.activity_id ? `/hr/recommendations/${n.activity_id}` : '/hr/activities')
      return
    }
    navigate('/admin/dashboard')
  }

  return (
    <header className="reveal sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-card/85 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center">
        <WeatherWidget collapsed={false} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="button-micro flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              const next = !showNotifications
              setShowNotifications(next)
              if (next) void refreshNotifications()
            }}
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
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
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
                    userNotifications.slice(0, 6).map((n) => (
                      <button
                        key={n.id}
                        className={cn(
                          'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-all hover:bg-accent',
                          !n.read && 'bg-accent/50',
                          n.rawType === 'CERTIFICATE_ISSUED' && 'bg-amber-50/40 dark:bg-amber-900/10',
                        )}
                        onClick={() => {
                          markNotificationRead(n.id)
                          setShowNotifications(false)
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
                      setShowNotifications(false)
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
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
