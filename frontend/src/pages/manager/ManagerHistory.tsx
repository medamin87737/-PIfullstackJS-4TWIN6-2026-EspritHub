import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { History, Calendar } from 'lucide-react'
import type { Activity } from '../../types'

export default function ManagerHistory() {
  const { fetchWithAuth } = useData()
  const [historyActivities, setHistoryActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
        const res = await fetchWithAuth(`${baseUrl}/manager/activities`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const rows = Array.isArray(payload?.activities) ? payload.activities : []
        const mapped: Activity[] = rows.map((a: any) => ({
          id: a?._id?.toString() ?? a?.id ?? crypto.randomUUID(),
          title: a?.title ?? '',
          description: a?.description ?? '',
          type: a?.type ?? 'training',
          required_skills: (a?.requiredSkills ?? []).map((s: any) => ({
            skill_name: s?.skill_name ?? '',
            desired_level: s?.desired_level ?? 'medium',
          })),
          seats: a?.maxParticipants ?? 0,
          date: a?.startDate ? new Date(a.startDate).toISOString() : new Date().toISOString(),
          end_date: a?.endDate ? new Date(a.endDate).toISOString() : undefined,
          duration: a?.duration ?? 'N/A',
          location: a?.location ?? 'N/A',
          priority: a?.priority ?? 'consolidate_medium',
          status: a?.status ?? 'open',
          created_by: a?.created_by ?? 'HR',
          created_at: a?.createdAt ?? new Date().toISOString(),
          updated_at: a?.updatedAt ?? new Date().toISOString(),
        }))
        // History should not be empty by default: show all manager department activities.
        setHistoryActivities(mapped)
      } catch (err) {
        console.error('Erreur chargement historique manager:', err)
        setHistoryActivities([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [fetchWithAuth])

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Historique</h1>
        <p className="text-sm text-muted-foreground">Activites passees et en cours</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
          <History className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chargement de l&apos;historique...</p>
        </div>
      ) : historyActivities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
          <History className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucun historique</p>
        </div>
      ) : (
        <div className="reveal-grid flex flex-col gap-3">
          {historyActivities.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 card-animated">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-card-foreground">{a.title}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {a.date}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.type} />
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
