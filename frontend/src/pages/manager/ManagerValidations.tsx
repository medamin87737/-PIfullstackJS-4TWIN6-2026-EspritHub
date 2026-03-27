import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '../../components/shared/StatusBadge'
import { Check, X, Target, TrendingUp, User } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'
import { useData } from '../../context/DataContext'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function normalizeScore(value: unknown): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  if (n > 1) return n / 100
  if (n < 0) return 0
  return n
}

function formatScorePercent(value: unknown): string {
  return `${(normalizeScore(value) * 100).toFixed(1)}%`
}

type ManagerRecommendation = {
  id: string
  _id?: string
  activity_id: string
  activity_title: string
  employee_id: string
  employee_name: string
  employee_email: string
  employee_matricule: string
  score_total: number
  score_nlp: number
  score_competences: number
  rank: number
  status:
    | 'HR_APPROVED'
    | 'HR_REJECTED'
    | 'MANAGER_APPROVED'
    | 'MANAGER_REJECTED'
    | 'NOTIFIED'
    | 'ACCEPTED'
    | 'DECLINED'
  absence_reason?: string
  seats_total?: number
  seats_taken?: number
  seats_remaining?: number
  parsed_activity?: {
    titre?: string
    description?: string
    contexte?: string
    required_skills?: { intitule: string; niveau_requis: number; poids: number }[]
  }
}
type EmployeeOption = { _id: string; name: string; email?: string; matricule?: string }
  const extractErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') return data.message
      if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0])
      return fallback
    } catch {
      return fallback
    }
  }


export default function ManagerValidations() {
  const { toast } = useToast()
  const { fetchWithAuth } = useData()
  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )
  const [pendingRecs, setPendingRecs] = useState<ManagerRecommendation[]>([])
  const [processedRecs, setProcessedRecs] = useState<ManagerRecommendation[]>([])
  const [profileModal, setProfileModal] = useState<{ open: boolean; employeeId?: string; data?: any }>({ open: false })
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [employeeResults, setEmployeeResults] = useState<EmployeeOption[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const remainingByActivity = useMemo(() => {
    const m = new Map<string, number>()
    for (const rec of pendingRecs) {
      if (!m.has(rec.activity_id)) m.set(rec.activity_id, Number(rec.seats_remaining ?? 0))
    }
    return m
  }, [pendingRecs])

  const loadPending = async () => {
    if (!token) return
    try {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager/pending`)
      if (!res.ok) throw new Error('Impossible de charger les validations manager')
      const all = (await res.json()) as ManagerRecommendation[]
      const pending = all.filter((r) => r.status === 'HR_APPROVED')
      const processed = all.filter((r) => r.status !== 'HR_APPROVED')
      setPendingRecs(pending)
      setProcessedRecs(processed)
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste de validation manager.',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    loadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const decide = async (rec: ManagerRecommendation, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activityId: rec.activity_id,
        decisions: [{ recommendationId: rec.id, action: status === 'APPROVED' ? 'approve' : 'reject' }],
      }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'La décision n’a pas pu être enregistrée.')
      toast({
        title: 'Action refusée',
        description: message,
        variant: 'destructive',
      })
      return
    }
    setPendingRecs((prev) => prev.filter((r) => r.id !== rec.id))
    setProcessedRecs((prev) => [{ ...rec, status: status === 'APPROVED' ? 'NOTIFIED' : 'MANAGER_REJECTED' }, ...prev])
    toast({
      title: status === 'APPROVED' ? 'Validation confirmée' : 'Validation refusée',
      description:
        status === 'APPROVED'
          ? `${rec.employee_name} est notifié(e) pour confirmer sa participation à ${rec.activity_title}.`
          : `${rec.employee_name} est refusé(e) pour ${rec.activity_title}.`,
      variant: status === 'APPROVED' ? 'default' : 'destructive',
    })
  }

  const bulkDecide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!token || pendingRecs.length === 0 || isBulkSubmitting) return
    setIsBulkSubmitting(true)
    try {
      const byActivity = pendingRecs.reduce<Record<string, ManagerRecommendation[]>>((acc, rec) => {
        if (!acc[rec.activity_id]) acc[rec.activity_id] = []
        acc[rec.activity_id].push(rec)
        return acc
      }, {})

      for (const [activityId, recs] of Object.entries(byActivity)) {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager-validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityId,
            decisions: recs.map((r) => ({
              recommendationId: r.id,
              action: status === 'APPROVED' ? 'approve' : 'reject',
            })),
          }),
        })

        if (!res.ok) {
          const message = await extractErrorMessage(res, 'Une partie des decisions n’a pas pu etre enregistree.')
          toast({ title: 'Validation refusée', description: message, variant: 'destructive' })
          return
        }
      }

      setProcessedRecs((prev) => [
        ...pendingRecs.map((r) => ({
          ...r,
          status: status === 'APPROVED' ? ('NOTIFIED' as const) : ('MANAGER_REJECTED' as const),
        })),
        ...prev,
      ])
      setPendingRecs([])
      toast({
        title: status === 'APPROVED' ? 'Validation globale confirmée' : 'Validation globale refusée',
        description:
          status === 'APPROVED'
            ? 'Tous les employés sélectionnés ont été notifiés.'
            : 'Toutes les recommandations en attente ont été refusées.',
      })
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  const openProfile = async (employeeId: string) => {
    if (!token) return
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/employees/${employeeId}/fiches`)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Profil indisponible.', variant: 'destructive' })
      return
    }
    const data = await res.json()
    const normalized = {
      employee: {
        name: data?.employee?.name ?? 'N/A',
        email: data?.employee?.email ?? '-',
        matricule: data?.employee?.matricule ?? '-',
        telephone: data?.employee?.telephone ?? '-',
      },
      fiches: Array.isArray(data?.fiches)
        ? data.fiches.map((f: any) => ({ ...f, competences: [] }))
        : [],
    }
    setProfileModal({ open: true, employeeId, data: normalized })
  }

  const searchEmployees = async (q: string) => {
    setEmployeeQuery(q)
    if (!q.trim()) {
      setEmployeeResults([])
      return
    }
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/employees/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return
    const data = await res.json()
    setEmployeeResults(Array.isArray(data) ? data.slice(0, 20) : [])
  }

  const addManual = async () => {
    if (!selectedEmployeeId || !selectedActivityId) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manual-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: selectedActivityId, employeeId: selectedEmployeeId, note: 'Ajout manuel manager' }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Ajout manuel impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    await loadPending()
    toast({ title: 'Ajustement appliqué', description: 'Employé ajouté à la liste des participants.' })
  }

  const removeManual = async (recommendationId: string) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/${recommendationId}`, { method: 'DELETE' })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Suppression impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    await loadPending()
    toast({ title: 'Ajustement appliqué', description: 'Recommandation retirée de la liste.' })
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Validation manager</h1>
        <p className="text-sm text-muted-foreground">{pendingRecs.length} recommandation(s) en attente de validation</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => bulkDecide('APPROVED')}
          disabled={pendingRecs.length === 0 || isBulkSubmitting || Array.from(remainingByActivity.values()).every((v) => v <= 0)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirmer tous
        </button>
        <button
          onClick={() => bulkDecide('REJECTED')}
          disabled={pendingRecs.length === 0 || isBulkSubmitting}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refuser tous
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium text-card-foreground">Ajuster la liste des participants</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={employeeQuery}
            onChange={(e) => { void searchEmployees(e.target.value) }}
            placeholder="Rechercher employé"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Choisir employé</option>
            {employeeResults.map((e) => (
              <option key={e._id} value={e._id}>{e.name} - {e.matricule ?? '-'}</option>
            ))}
          </select>
          <select value={selectedActivityId} onChange={(e) => setSelectedActivityId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Choisir activité</option>
            {Array.from(new Set(pendingRecs.map((r) => `${r.activity_id}::${r.activity_title}`))).map((entry) => {
              const [id, title] = entry.split('::')
              return <option key={id} value={id}>{title}</option>
            })}
          </select>
          <button onClick={addManual} disabled={!selectedEmployeeId || !selectedActivityId} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            Ajouter à la liste
          </button>
        </div>
      </div>

      {pendingRecs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12">
          <Check className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">Toutes les recommandations ont ete traitees</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingRecs.map(rec => (
              <div key={rec.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {rec.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-card-foreground">{rec.employee_name}</span>
                      <span className="text-xs text-muted-foreground">{rec.employee_email} · {rec.employee_matricule}</span>
                    </div>
                  </div>
                  <StatusBadge status={rec.status.toLowerCase()} />
                </div>

                <div className="mt-3 rounded-lg bg-background p-3">
                  <span className="text-xs font-medium text-muted-foreground">Activite:</span>
                  <span className="ml-2 text-sm font-medium text-card-foreground">{rec.activity_title}</span>
                  {rec.parsed_activity?.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{rec.parsed_activity.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Places: {Number(rec.seats_taken ?? 0)}/{Number(rec.seats_total ?? 0)} utilisees
                    {' · '}
                    Restantes: {Math.max(0, Number(rec.seats_remaining ?? 0))}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Score:</span>
                    <span className="text-sm font-bold text-primary">{formatScorePercent(rec.score_total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatScorePercent(rec.score_nlp)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{formatScorePercent(rec.score_competences)}</span>
                  </div>
                </div>

                <p className="mt-2 text-xs italic text-muted-foreground">Classement #{rec.rank} pour cette activité</p>
                {rec.parsed_activity?.required_skills && rec.parsed_activity.required_skills.length > 0 && (
                  <div className="mt-2 rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Competences exigees</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {rec.parsed_activity.required_skills.map((s, idx) => (
                        <span key={`${rec.id}-${idx}`} className="rounded-full bg-muted px-2 py-1 text-[11px] text-foreground">
                          {s.intitule} niv {s.niveau_requis} ({Math.round((s.poids ?? 0) * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                  <button onClick={() => openProfile(rec.employee_id)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent">
                    <User className="h-4 w-4" /> Voir profil
                  </button>
                  <button onClick={() => decide(rec, 'APPROVED')}
                    disabled={Number(rec.seats_remaining ?? 0) <= 0}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Check className="h-4 w-4" /> Confirmer
                  </button>
                  <button onClick={() => decide(rec, 'REJECTED')}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent">
                    <X className="h-4 w-4" /> Refuser
                  </button>
                  <button onClick={() => removeManual(rec.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent">
                    Retirer de la liste
                  </button>
                </div>
              </div>
          ))}
        </div>
      )}

      {/* All recommendations for my activities */}
      {processedRecs.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-card-foreground">Recommandations traitees</h3>
          </div>
          <div className="divide-y divide-border">
            {processedRecs.map(rec => (
              <div key={rec.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {rec.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-card-foreground">{rec.employee_name}</span>
                    <span className="text-xs text-muted-foreground">{rec.activity_title}</span>
                    {rec.absence_reason && (
                      <span className="text-xs text-destructive">Motif absence: {rec.absence_reason}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatScorePercent(rec.score_total)}</span>
                  <StatusBadge status={rec.status.toLowerCase()} />
                </div>
                {rec.absence_reason && (
                  <span className="text-xs text-destructive">Motif absence: {rec.absence_reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    {profileModal.open && profileModal.data && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fade-in">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl animate-slide-up">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">Profil employe</h2>
            <button onClick={() => setProfileModal({ open: false })} className="text-sm text-muted-foreground hover:underline">Fermer</button>
          </div>
          <div className="p-6">
            <div className="mb-4 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-card-foreground">{profileModal.data.employee.name}</p>
              <p className="text-xs text-muted-foreground">
                {profileModal.data.employee.email} · {profileModal.data.employee.matricule} · {profileModal.data.employee.telephone}
              </p>
            </div>
            {profileModal.data.fiches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune fiche d evaluation</p>
            ) : (
              <div className="flex flex-col gap-3">
                {profileModal.data.fiches.map((f: any) => (
                  <div key={f.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-card-foreground">Fiche {f.saisons}</span>
                      <StatusBadge status={String(f.etat).toLowerCase()} />
                    </div>
                    {f.competences.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {f.competences.map((c: any, idx: number) => (
                          <div key={`${f.id}-${idx}`} className="rounded-md border border-muted px-2 py-1">
                            <p className="text-xs font-medium text-card-foreground">{c.intitule}</p>
                            <p className="text-[11px] text-muted-foreground">Auto: {c.auto_eval ?? '-'} · Manager: {c.hierarchie_eval ?? '-'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
