import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { Bell, Search, Sun, Moon } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useI18n } from '../../hooks/useI18n'

export default function Header() {
  const { user } = useAuth()
  const { getUserNotifications, markNotificationRead, refreshNotifications } = useData()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const t = useI18n()

  if (!user) return null

  const userNotifications = getUserNotifications(user.id)
  const unreadCount = userNotifications.filter(n => !n.read).length

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const goToNotificationTarget = (n: { activity_id?: string }) => {
    if (!user) return
    if (user.role === 'EMPLOYEE') {
      navigate(n.activity_id ? `/employee/activities?activityId=${n.activity_id}` : '/employee/notifications')
      return
    }
    if (user.role === 'MANAGER') {
      navigate('/manager/activities')
      return
    }
    if (user.role === 'HR') {
      navigate('/hr/activities')
      return
    }
    navigate('/admin/dashboard')
  }

  return (
    <header className="reveal sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/70 bg-card/85 px-6 backdrop-blur-xl">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('header.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-micro h-9 w-full rounded-lg border border-input bg-background/80 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
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
              const nextState = !showNotifications
              setShowNotifications(nextState)
              if (nextState) {
                void refreshNotifications()
              }
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
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-card-foreground">
                    {t('header.notifications')}
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {userNotifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t('header.noNotifications')}
                    </p>
                  ) : (
                    userNotifications.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        className={cn(
                          'flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-all hover:bg-accent hover:translate-x-1',
                          !n.read && 'bg-accent/50'
                        )}
                        onClick={() => {
                          markNotificationRead(n.id)
                          setShowNotifications(false)
                          goToNotificationTarget(n)
                        }}
                      >
                        <span className="text-sm font-medium text-card-foreground">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{n.message}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))
                  )}
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
