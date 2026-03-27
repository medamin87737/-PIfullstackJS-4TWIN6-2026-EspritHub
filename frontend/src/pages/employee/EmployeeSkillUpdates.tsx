import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import { TrendingDown, TrendingUp } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type SkillUpdateRow = {
  activity_id: string
  activity_title: string
  status: string
  feedback: string
  completed_at?: string | null
  skill_updates: Array<{
    intitule?: string
    level_required?: number
    delta_applied?: number
    before?: { auto_eval?: number; hierarchie_eval?: number }
    after?: { auto_eval?: number; hierarchie_eval?: number }
  }>
}

export default function EmployeeSkillUpdates() {
  const { fetchWithAuth } = useData()
  const [rows, setRows] = useState<SkillUpdateRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my-skill-updates`)
        if (!res.ok) return
        const data = await res.json()
        setRows(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evolution de mes competences</h1>
        <p className="text-sm text-muted-foreground">
          Historique des augmentations/diminutions appliquees apres vos reponses aux activites.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mise a jour de competences pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={`${r.activity_id}-${idx}`} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold text-card-foreground">{r.activity_title}</p>
                <p className="text-xs text-muted-foreground">
                  Statut: {r.status} {r.completed_at ? `· ${new Date(r.completed_at).toLocaleString('fr-FR')}` : ''}
                </p>
                {r.feedback && <p className="mt-1 text-xs text-muted-foreground">Motif: {r.feedback}</p>}
                <div className="mt-2 space-y-1">
                  {(Array.isArray(r.skill_updates) ? r.skill_updates : []).map((s, skillIdx) => {
                    const delta = Number(s?.delta_applied ?? 0)
                    const isUp = delta > 0
                    return (
                      <div key={`${r.activity_id}-${idx}-${skillIdx}`} className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1">
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {s?.intitule ?? 'Compétence'} {typeof s?.level_required === 'number' ? `· niveau ${s.level_required}` : ''}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Avant: {Number(s?.before?.auto_eval ?? 0).toFixed(2)} / {Number(s?.before?.hierarchie_eval ?? 0).toFixed(2)} ·
                            Apres: {Number(s?.after?.auto_eval ?? 0).toFixed(2)} / {Number(s?.after?.hierarchie_eval ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <div className={`inline-flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

