import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { Calendar, MapPin, Users, ArrowRight, Presentation, Upload, X, ArrowUpDown } from 'lucide-react'
import type { Activity } from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export default function ManagerActivities() {
  const { fetchWithAuth } = useData()
  const { user } = useAuth()
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [sortDesc, setSortDesc] = useState(true)
  const [pptxModal, setPptxModal] = useState<string | null>(null)
  const [pptxFile, setPptxFile] = useState<File | null>(null)
  const [pptxLoading, setPptxLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sortedActivities = useMemo(() => {
    const parseDate = (a: Activity) => {
      const raw = a.created_at ?? a.date
      const t = new Date(raw).getTime()
      return Number.isFinite(t) ? t : 0
    }
    return [...myActivities].sort((a, b) => {
      const diff = parseDate(b) - parseDate(a)
      return sortDesc ? diff : -diff
    })
  }, [myActivities, sortDesc])

  const handleExportPptx = async (activityId: string) => {
    setPptxLoading(true)
    try {
      const formData = new FormData()
      if (pptxFile) formData.append('file', pptxFile)

      const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE_URL}/activities/${activityId}/export-pptx-manager`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(errText)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presentation-manager-${activityId}.pptx`
      a.click()
      URL.revokeObjectURL(url)
      setPptxModal(null)
      setPptxFile(null)
    } catch (err: any) {
      alert(`Erreur : ${err?.message ?? 'Génération PPTX impossible'}`)
    } finally {
      setPptxLoading(false)
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes activites</h1>
            <p className="text-sm text-muted-foreground">{myActivities.length} activites assignees</p>
          </div>
          <button
            onClick={() => setSortDesc((p) => !p)}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortDesc ? 'Plus récentes' : 'Plus anciennes'}
          </button>
        </div>
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
          sortedActivities.map(a => (
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPptxModal(a.id); setPptxFile(null) }}
                    title="Générer une présentation PPTX"
                    className="flex items-center justify-center rounded-lg border border-violet-400 bg-violet-50 p-2 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400"
                  >
                    <Presentation className="h-4 w-4" />
                  </button>
                  <Link to={`/manager/activity/${a.id}`} className="button-micro flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    Details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal PPTX enrichi Manager */}
      {pptxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">Générer présentation Manager</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joignez un fichier .docx ou .pdf avec le programme détaillé (optionnel).
                </p>
              </div>
              <button onClick={() => { setPptxModal(null); setPptxFile(null) }} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              {/* Zone upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-6 hover:border-primary hover:bg-accent/30 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                {pptxFile ? (
                  <p className="text-sm font-medium text-primary">{pptxFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-card-foreground">Cliquez pour joindre un fichier</p>
                    <p className="text-xs text-muted-foreground">.docx ou .pdf — programme, certifications, plan jour par jour</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => setPptxFile(e.target.files?.[0] ?? null)}
              />
              {pptxFile && (
                <button onClick={() => setPptxFile(null)} className="text-xs text-muted-foreground hover:text-destructive self-start">
                  × Retirer le fichier
                </button>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setPptxModal(null); setPptxFile(null) }}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void handleExportPptx(pptxModal)}
                  disabled={pptxLoading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Presentation className="h-4 w-4" />
                  {pptxLoading ? 'Génération...' : 'Générer PPTX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
