import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import type { Activity } from '../../types'

export default function ManagerActivities() {
  const { fetchWithAuth } = useData()
  const { user } = useAuth()
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setMyActivities([])
        setLoading(false)
        return
      }
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
          assigned_manager: user.id,
          created_at: a?.createdAt ?? new Date().toISOString(),
          updated_at: a?.updatedAt ?? new Date().toISOString(),
        }))
        setMyActivities(mapped)
      } catch (err) {
        console.error('Erreur chargement activités manager:', err)
        setMyActivities([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [fetchWithAuth, user])

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Mes activites</h1>
        <p className="text-sm text-muted-foreground">{myActivities.length} activites assignees</p>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <p className="text-sm text-muted-foreground">Chargement des activites...</p>
          </div>
        ) : myActivities.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <p className="text-sm text-muted-foreground">Aucune activite assignee</p>
          </div>
        ) : (
          myActivities.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5 card-animated">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{a.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {a.date}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {a.location}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> {a.seats} places</div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex gap-2">
                  <StatusBadge status={a.type} />
                  <StatusBadge status={a.priority} />
                </div>
                <Link to={`/manager/activity/${a.id}`} className="button-micro flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
