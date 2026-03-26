import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { History, Calendar, Target } from 'lucide-react'

function mapEmployeeStatusLabel(status: string): string {
  const s = String(status ?? '').toUpperCase()
  if (s === 'ACCEPTED') return 'Participation confirmee'
  if (s === 'DECLINED') return 'Participation refusee'
  if (s === 'NOTIFIED') return 'Invitation recue'
  if (s === 'MANAGER_APPROVED') return 'Validee par manager'
  return s || '-'
}

export default function EmployeeHistory() {
  const { fetchWithAuth } = useData()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

  const myRecs = useMemo(
    () => rows.filter((r) => ['ACCEPTED', 'DECLINED', 'NOTIFIED', 'MANAGER_APPROVED'].includes(String(r?.status ?? ''))),
    [rows],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erreur chargement historique employe:', err)
        setRows([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [API_BASE_URL, fetchWithAuth])

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Historique de participation</h1>
        <p className="text-sm text-muted-foreground">Suivi de toutes vos activites</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
          <History className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chargement de l&apos;historique...</p>
        </div>
      ) : myRecs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
          <History className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucun historique de participation</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myRecs.map(rec => {
            const activity = rec?.activityId
            const title = activity?.title ?? activity?.titre ?? 'Activite inconnue'
            const when = activity?.date ?? activity?.startDate
            const score = Number(rec?.score_total ?? 0)
            const recStatus = String(rec?.status ?? '').toLowerCase()
            const statusLabel = mapEmployeeStatusLabel(String(rec?.status ?? ''))
            const reason = String(rec?.employee_response ?? '').trim()
            return (
              <div key={String(rec?._id ?? rec?.id ?? crypto.randomUUID())} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 card-animated">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">{title}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {when ? new Date(when).toLocaleDateString('fr-FR') : '-'}</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Score: {(score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{statusLabel}</p>
                  {reason && <p className="text-xs text-destructive">Motif: {reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {activity?.type && <StatusBadge status={String(activity.type).toLowerCase()} />}
                  <StatusBadge status={recStatus || 'general'} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
