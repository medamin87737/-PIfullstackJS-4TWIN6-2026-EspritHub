import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { Bell, Check, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type EmployeePendingRec = {
  id: string
  activity_id?: string
  activity_title: string
  created_at?: string
}
type NotificationItem = {
  _id: string
  title: string
  message: string
  created_at: string
  read: boolean
  activityId?: string
  data?: { activityId?: string; activity_id?: string }
}

export default function EmployeeNotifications() {
  const { fetchWithAuth } = useData()
  const navigate = useNavigate()
  const [items, setItems] = useState<EmployeePendingRec[]>([])
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )

  useEffect(() => {
    const load = async () => {
      if (!token) return
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my`)
      if (!res.ok) return
      const raw = (await res.json()) as any[]
      const data = raw
        .filter((r: any) => String(r?.status ?? '') === 'NOTIFIED')
        .map((r: any) => ({
          id: String(r?._id ?? r?.id ?? ''),
          activity_id: String(r?.activityId?._id ?? r?.activityId ?? ''),
          activity_title: String(r?.activityId?.title ?? r?.activityId?.titre ?? 'Activite'),
          created_at: r?.created_at ? String(r.created_at) : undefined,
        })) as EmployeePendingRec[]
      setItems(data)
      const res2 = await fetchWithAuth(`${API_BASE_URL}/notifications/me`)
      if (res2.ok) {
        const raw = (await res2.json()) as any[]
        const mapped = raw.map((n) => ({
          ...n,
          activityId: n?.activityId ?? n?.data?.activityId ?? n?.data?.activity_id,
        })) as NotificationItem[]
        setNotifs(mapped)
      }
    }
    void load()
  }, [fetchWithAuth, token])

  const markRead = async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH' })
    if (res.ok) {
      setNotifs(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)))
    }
  }
  const removeNotif = async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setNotifs(prev => prev.filter(n => n._id !== id))
    }
  }

  const openActivity = (activityId?: string) => {
    if (!activityId) return
    navigate(`/employee/activities?activityId=${activityId}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">{items.length} en attente · {notifs.filter(n => !n.read).length} non lues</p>
      </div>

      <div className="reveal-grid flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={cn(
              'flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 card-animated',
            )}>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Validation employee requise</span>
                  <span className="text-xs text-muted-foreground">Confirmer votre presence: {n.activity_title}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(n.created_at ?? Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {!!n.activity_id && (
                <button
                  onClick={() => openActivity(n.activity_id)}
                  className="button-micro rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Voir activite
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="reveal reveal-right mt-6">
        <h2 className="mb-2 text-sm font-semibold text-card-foreground">Historique</h2>
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-8">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifs.map((n) => (
              <div key={n._id} className={cn(
                'flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4',
                !n.read && 'border-primary/20 bg-primary/5'
              )}>
                <div className="flex items-center gap-3">
                  {!n.read && <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-card-foreground">{n.title}</span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!!n.activityId && (
                    <button
                      onClick={() => openActivity(n.activityId)}
                      className="button-micro flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-accent"
                    >
                      Voir activite
                    </button>
                  )}
                  {!n.read && (
                    <button onClick={() => markRead(n._id)} className="button-micro flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-medium text-accent-foreground hover:opacity-80">
                      <Check className="h-3.5 w-3.5" /> Lu
                    </button>
                  )}
                  <button onClick={() => removeNotif(n._id)} className="button-micro flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-accent">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
