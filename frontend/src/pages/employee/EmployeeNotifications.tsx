import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { Bell, Check, Trash2, Award, Download, RefreshCw } from 'lucide-react'
import { cn } from '../../../lib/utils'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type NotificationItem = {
  _id: string
  type: string
  title: string
  message: string
  created_at: string
  read: boolean
  activityId?: string
  data: {
    activityId?: string
    activity_id?: string
    certificateId?: string
    activityTitle?: string
    rank?: number
    issueDate?: string
  }
}

type PendingRec = {
  id: string
  activity_id: string
  activity_title: string
  created_at?: string
}

export default function EmployeeNotifications() {
  const { fetchWithAuth } = useData()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [pendingRecs, setPendingRecs] = useState<PendingRec[]>([])
  const [loading, setLoading] = useState(true)

  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )

  const loadAll = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      // Charger les recommandations en attente de confirmation employé
      const recRes = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my`, {
        headers: { 'x-toast-silent': 'true' },
      })
      if (recRes.ok) {
        const raw = (await recRes.json()) as any[]
        setPendingRecs(
          raw
            .filter((r: any) => String(r?.status ?? '') === 'NOTIFIED')
            .map((r: any) => ({
              id: String(r?._id ?? ''),
              activity_id: String(r?.activityId?._id ?? r?.activityId ?? ''),
              activity_title: String(r?.activityId?.title ?? r?.activityId?.titre ?? 'Activité'),
              created_at: r?.created_at ? String(r.created_at) : undefined,
            })),
        )
      }

      // Charger toutes les notifications
      const notifRes = await fetchWithAuth(`${API_BASE_URL}/notifications/me`, {
        headers: { 'x-toast-silent': 'true' },
      })
      if (notifRes.ok) {
        const raw = (await notifRes.json()) as any[]
        setNotifs(
          raw.map((n: any) => ({
            _id: String(n._id ?? n.id ?? ''),
            type: String(n.type ?? ''),
            title: String(n.title ?? ''),
            message: String(n.message ?? ''),
            created_at: String(n.created_at ?? new Date().toISOString()),
            read: Boolean(n.read),
            activityId: n?.data?.activityId ?? n?.data?.activity_id ?? undefined,
            data: n.data && typeof n.data === 'object' ? n.data : {},
          })),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth, token])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Écoute WebSocket pour les nouvelles notifications en temps réel
  useEffect(() => {
    if (!token) return
    let socket: any
    import('socket.io-client').then(({ io }) => {
      const userId = (() => {
        try { return JSON.parse(atob(token.split('.')[1] ?? ''))?.sub ?? '' }
        catch { return '' }
      })()
      if (!userId) return
      socket = io(API_BASE_URL, { query: { userId }, transports: ['websocket', 'polling'] })
      socket.on('notification_created', () => void loadAll())
    }).catch(() => {})
    return () => socket?.disconnect?.()
  }, [token, loadAll])

  const markRead = async (id: string) => {
    await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'x-toast-silent': 'true' },
    })
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    await fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'x-toast-silent': 'true' },
    })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotif = async (id: string) => {
    await fetchWithAuth(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers: { 'x-toast-silent': 'true' },
    })
    setNotifs(prev => prev.filter(n => n._id !== id))
  }

  const downloadCertificate = async (certificateId: string, activityTitle: string) => {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/recommendations/certificates/${certificateId}/download`,
        { headers: { 'x-toast-silent': 'true' } },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Certificat introuvable' }))
        alert(err?.message ?? 'Impossible de télécharger le certificat')
        return
      }
      const body = await res.json()
      const pdfData: string = body?.pdfData ?? ''
      const filename: string = body?.filename ?? `certificat_${activityTitle}.pdf`
      if (!pdfData) { alert('Données du certificat manquantes'); return }
      const a = document.createElement('a')
      a.href = pdfData
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      alert(`Erreur téléchargement : ${e?.message ?? 'inconnue'}`)
    }
  }

  const unreadCount = notifs.filter(n => !n.read).length
  const certNotifs = notifs.filter(n => n.type === 'CERTIFICATE_ISSUED')
  const otherNotifs = notifs.filter(n => n.type !== 'CERTIFICATE_ISSUED')

  return (
    <div className="flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div className="reveal reveal-left animate-slide-up flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {pendingRecs.length} confirmation(s) en attente · {unreadCount} non lue(s)
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Check className="h-3.5 w-3.5" /> Tout marquer lu
            </button>
          )}
          <button
            onClick={() => void loadAll()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Confirmations en attente ── */}
      {pendingRecs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-card-foreground">Confirmations en attente</h2>
          {pendingRecs.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">Confirmation requise</span>
                  <span className="text-xs text-muted-foreground">{r.activity_title}</span>
                  {r.created_at && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/employee/activities?activityId=${r.activity_id}`)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Répondre
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Certificats ── */}
      {certNotifs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-card-foreground">🎓 Mes certificats</h2>
          {certNotifs.map((n) => (
            <div key={n._id} className={cn(
              'flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-50/30 dark:bg-amber-900/10 px-5 py-4',
              !n.read && 'ring-1 ring-amber-400/30',
            )}>
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 shrink-0 text-amber-500" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-card-foreground">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.message}</span>
                  {n.data?.issueDate && (
                    <span className="text-[10px] text-amber-600/80 font-medium">
                      Délivré le {n.data.issueDate}
                      {n.data.rank ? ` · Classement #${n.data.rank}` : ''}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {n.data?.certificateId && (
                  <button
                    onClick={() => downloadCertificate(n.data.certificateId!, n.data?.activityTitle ?? 'certificat')}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-500/10 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger PDF
                  </button>
                )}
                {!n.read && (
                  <button onClick={() => markRead(n._id)} className="flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-medium hover:opacity-80">
                    <Check className="h-3.5 w-3.5" /> Lu
                  </button>
                )}
                <button onClick={() => removeNotif(n._id)} className="flex h-8 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-accent">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Autres notifications ── */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-card-foreground">Historique</h2>
        {otherNotifs.length === 0 && certNotifs.length === 0 && pendingRecs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : otherNotifs.length === 0 ? null : (
          otherNotifs.map((n) => (
            <div key={n._id} className={cn(
              'flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4',
              !n.read && 'border-primary/20 bg-primary/5',
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
                {n.activityId && (
                  <button
                    onClick={() => navigate(`/employee/activities?activityId=${n.activityId}`)}
                    className="flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-accent"
                  >
                    Voir activité
                  </button>
                )}
                {!n.read && (
                  <button onClick={() => markRead(n._id)} className="flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-medium hover:opacity-80">
                    <Check className="h-3.5 w-3.5" /> Lu
                  </button>
                )}
                <button onClick={() => removeNotif(n._id)} className="flex h-8 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-accent">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
