import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { History, Calendar, MapPin, Users, LayoutList, ChartColumn } from 'lucide-react'

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
  const [layout, setLayout] = useState<'text' | 'stats'>('text')

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

  const stats = useMemo(() => {
    const total = historyRows.length
    const approved = historyRows.filter((r) => r.description.includes('Approuve')).length
    const rejected = historyRows.filter((r) => r.description.includes('Rejete')).length
    const impactedTotal = historyRows.reduce((acc, r) => acc + Number(r.seats || 0), 0)

    const byActionMap = new Map<string, number>()
    for (const row of historyRows) {
      byActionMap.set(row.title, (byActionMap.get(row.title) ?? 0) + 1)
    }
    const byAction = Array.from(byActionMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    const byMonthMap = new Map<string, number>()
    for (const row of historyRows) {
      const key = new Date(row.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      byMonthMap.set(key, (byMonthMap.get(key) ?? 0) + 1)
    }
    const byMonth = Array.from(byMonthMap.entries())
      .map(([label, value]) => ({ label, value }))
      .slice(-6)

    return { total, approved, rejected, impactedTotal, byAction, byMonth }
  }, [historyRows])

  const maxAction = Math.max(1, ...stats.byAction.map((x) => x.value))
  const maxMonth = Math.max(1, ...stats.byMonth.map((x) => x.value))

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
        <h1 className="text-2xl font-bold text-foreground">Historique des activites</h1>
        <p className="text-sm text-muted-foreground">Suivi complet des activites passees et en cours</p>
          </div>
          <div className="inline-flex rounded-lg border border-input bg-background p-1">
            <button
              type="button"
              onClick={() => setLayout('text')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                layout === 'text' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Historique
            </button>
            <button
              type="button"
              onClick={() => setLayout('stats')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                layout === 'stats' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
              }`}
            >
              <ChartColumn className="h-3.5 w-3.5" />
              Statistiques
            </button>
          </div>
        </div>
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
        ) : layout === 'text' ? (
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
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground">KPIs RH</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Actions totales</p>
                  <p className="text-xl font-semibold text-foreground">{stats.total}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Approuvées</p>
                  <p className="text-xl font-semibold text-emerald-600">{stats.approved}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Rejetées</p>
                  <p className="text-xl font-semibold text-destructive">{stats.rejected}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Personnes impactées</p>
                  <p className="text-xl font-semibold text-foreground">{stats.impactedTotal}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground">Top actions RH</h3>
              <div className="mt-3 space-y-2">
                {stats.byAction.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Pas de données.</p>
                ) : (
                  stats.byAction.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${(item.value / maxAction) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
              <h3 className="text-sm font-semibold text-card-foreground">Tendance (6 derniers mois)</h3>
              <div className="mt-3">
                {stats.byMonth.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Pas de données.</p>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="flex h-48 items-end gap-3">
                      {stats.byMonth.map((item) => (
                        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                          <span className="text-[11px] font-medium text-foreground">{item.value}</span>
                          <div className="flex h-36 w-full items-end rounded bg-muted/60 p-1">
                            <div
                              className="w-full rounded bg-primary transition-all"
                              style={{ height: `${Math.max(6, (item.value / maxMonth) * 100)}%` }}
                              title={`${item.label}: ${item.value} actions`}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Histogramme des actions RH par mois (6 derniers mois).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
