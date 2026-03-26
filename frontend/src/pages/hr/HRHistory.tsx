import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { History, Calendar, MapPin, Users } from 'lucide-react'

function mapActionLabel(action: string): string {
  const a = String(action ?? '').toLowerCase()
  if (a.includes('generate')) return 'Generation IA'
  if (a.includes('hr_validate')) return 'Validation RH'
  if (a.includes('manager_validate')) return 'Validation manager'
  if (a.includes('employee_respond')) return 'Reponse employe'
  if (a.includes('manual_add')) return 'Ajout manuel'
  if (a.includes('remove_recommendation')) return 'Suppression recommandation'
  if (a.includes('simulate')) return 'Simulation IA'
  return action || 'Action'
}

function mapResult(after: any): string {
  const status = String(after?.status ?? after?.response ?? '').toUpperCase()
  if (status.includes('APPROVED') || status === 'ACCEPTED') return 'Approuve'
  if (status.includes('REJECTED') || status === 'DECLINED') return 'Rejete'
  if (status === 'NOTIFIED') return 'Notifie'
  return '-'
}

export default function HRHistory() {
  const { fetchWithAuth } = useData()
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/audit/recommendations?limit=300`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erreur chargement historique RH:', err)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [API_BASE_URL, fetchWithAuth])

  const historyRows = useMemo(
    () =>
      logs.map((l) => ({
        id: String(l?._id ?? crypto.randomUUID()),
        title: mapActionLabel(String(l?.action ?? 'action')),
        description: `Acteur: ${String(l?.actorRole ?? '-')} · Resultat: ${mapResult(l?.after)}`,
        type: String(l?.entityType ?? 'general').toLowerCase(),
        status: 'completed',
        date: l?.createdAt ?? new Date().toISOString(),
        location: String(
          l?.metadata?.activityTitle ??
          l?.metadata?.activityId ??
          l?.entityId ??
          '-',
        ),
        seats: Number(
          l?.metadata?.notifiedCount ??
          l?.metadata?.approvedCount ??
          l?.metadata?.rejectedCount ??
          l?.metadata?.affected ??
          0,
        ),
        detail: {
          activityId: l?.metadata?.activityId ?? '-',
          actorId: String(l?.actorId ?? '-'),
        },
      })),
    [logs],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Historique des activites</h1>
        <p className="text-sm text-muted-foreground">Suivi complet des activites passees et en cours</p>
      </div>

      <div className="reveal-grid flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chargement de l&apos;historique...</p>
          </div>
        ) : historyRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
          </div>
        ) : (
          historyRows.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5 card-animated">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{a.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">{a.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.type} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Activite: <span className="font-medium text-foreground">{a.location}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ActivityId: {a.detail.activityId} · ActorId: {a.detail.actorId}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(a.date).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {a.type}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {a.seats} impactes
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
