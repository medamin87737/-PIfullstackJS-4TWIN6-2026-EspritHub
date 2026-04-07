import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { ArrowLeft, Check, Mail, Medal, Target, TrendingUp, User, X } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'

type ApiRecommendation = {
  _id: string
  userId: { _id: string; name: string; email: string; matricule: string } | string
  score_total: number
  score_nlp: number
  score_competences: number
  rank: number
  status:
    | 'PENDING'
    | 'HR_APPROVED'
    | 'SENT_TO_MANAGER'
    | 'HR_REJECTED'
    | 'MANAGER_APPROVED'
    | 'MANAGER_REJECTED'
    | 'NOTIFIED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'EMPLOYEE_CONFIRMED'
    | 'EMPLOYEE_DECLINED'
  absence_reason?: string | null
  parsed_activity?: { description?: string; required_skills?: { intitule: string; niveau_requis: number; poids: number }[] }
}

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

function looksLikeObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(value ?? ''))
}

export default function ManagerActivityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activities, fetchWithAuth } = useData()
  const { toast } = useToast()
  const [recs, setRecs] = useState<ApiRecommendation[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [processingAll, setProcessingAll] = useState(false)
  const [sendingEmail, setSendingEmail] = useState<Record<string, boolean>>({})
  const [profileModal, setProfileModal] = useState<{ open: boolean; data?: any }>({ open: false })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApiRecommendation['status']>('ALL')
  const [managerEvalInputs, setManagerEvalInputs] = useState<Record<string, Record<string, number>>>({})
  const [managerEvalLoading, setManagerEvalLoading] = useState<Record<string, boolean>>({})
  const [managerEvalDone, setManagerEvalDone] = useState<Record<string, boolean>>({})

  const activity = activities.find((a) => a.id === id)
  const actionableRecs = useMemo(
    () => recs.filter((r) => ['PENDING', 'HR_APPROVED', 'SENT_TO_MANAGER'].includes(String(r.status))),
    [recs],
  )
  const filteredRecs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return recs.filter((r) => {
      const userInfo =
        typeof r.userId === 'string'
          ? { name: r.userId, email: '', matricule: '' }
          : r.userId
      const matchesStatus = statusFilter === 'ALL' ? true : r.status === statusFilter
      if (!matchesStatus) return false
      if (!q) return true
      return (
        String(userInfo.name ?? '').toLowerCase().includes(q) ||
        String(userInfo.email ?? '').toLowerCase().includes(q) ||
        String(userInfo.matricule ?? '').toLowerCase().includes(q)
      )
    })
  }, [recs, searchQuery, statusFilter])

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

  const loadRecommendations = async () => {
    if (!id) return
    setLoadingRecs(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/activity/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = (await res.json()) as any[]
      const normalized = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        ...r,
        // Backend stores employee decline reason in employee_response.
        absence_reason: r?.absence_reason ?? r?.employee_response ?? null,
      })) as ApiRecommendation[]
      console.log('Loaded recommendations:', normalized)
      setRecs(normalized.sort((a, b) => Number(a.rank ?? 0) - Number(b.rank ?? 0)))
    } catch (err) {
      console.error('Erreur chargement recommandations activité:', err)
      setRecs([])
    } finally {
      setLoadingRecs(false)
    }
  }

  useEffect(() => {
    void loadRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!activity) return <div className="p-8 text-center text-muted-foreground">Activite non trouvee</div>

  const loadProfile = async (employeeId: string) => {
    if (!employeeId) {
      toast({ title: 'Profil indisponible', description: "ID employe introuvable.", variant: 'destructive' })
      return
    }
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/employees/${employeeId}/fiches`)
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Profil indisponible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setProfileModal({ open: true, data })
  }

  const decide = async (recommendationId: string, action: 'approve' | 'reject') => {
    if (!id) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: id, decisions: [{ recommendationId, action }] }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'La decision n’a pas pu etre enregistree.')
      toast({ title: 'Action refusée', description: message, variant: 'destructive' })
      return
    }
    await loadRecommendations()
    toast({ title: action === 'approve' ? 'Validation confirmée' : 'Validation refusée' })
  }

  const bulkDecide = async (action: 'approve' | 'reject') => {
    if (!id || actionableRecs.length === 0 || processingAll) return
    setProcessingAll(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: id,
          decisions: actionableRecs.map((r) => ({ recommendationId: r._id, action })),
        }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Action groupée impossible')
        toast({ title: 'Erreur', description: message, variant: 'destructive' })
        return
      }
      await loadRecommendations()
      toast({ title: action === 'approve' ? 'Accepter tous terminé' : 'Rejeter tous terminé' })
    } finally {
      setProcessingAll(false)
    }
  }

  const sendInvitationEmail = async (employeeId: string) => {
    if (!id || sendingEmail[employeeId]) return
    setSendingEmail((prev) => ({ ...prev, [employeeId]: true }))
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/manager/activities/${id}/send-invitation/${employeeId}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Impossible d\'envoyer l\'email')
        toast({ title: 'Erreur', description: message, variant: 'destructive' })
        return
      }
      const data = await res.json()
      toast({ title: 'Email envoyé', description: data.message || 'L\'invitation a été envoyée avec succès' })
      // Recharger les recommandations pour mettre à jour le statut
      await loadRecommendations()
    } finally {
      setSendingEmail((prev) => ({ ...prev, [employeeId]: false }))
    }
  }

  const setManagerEvalValue = (recommendationId: string, skill: string, value: number) => {
    setManagerEvalInputs((prev) => ({
      ...prev,
      [recommendationId]: {
        ...(prev[recommendationId] ?? {}),
        [skill]: value,
      },
    }))
  }

  const submitManagerEval = async (rec: ApiRecommendation) => {
    const skills = (rec.parsed_activity?.required_skills ?? []).map((s) => ({
      intitule: String(s.intitule ?? ''),
      hierarchie_eval: Number(managerEvalInputs?.[rec._id]?.[String(s.intitule ?? '')] ?? 0),
    }))
    if (skills.length === 0 || skills.some((s) => !Number.isFinite(s.hierarchie_eval) || s.hierarchie_eval < 0 || s.hierarchie_eval > 10)) {
      toast({
        title: 'Evaluation invalide',
        description: 'Renseignez une note 0-10 pour chaque compétence.',
        variant: 'destructive',
      })
      return
    }

    setManagerEvalLoading((prev) => ({ ...prev, [rec._id]: true }))
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/post-activity/manager-eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: rec._id, skills }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Impossible d’enregistrer l’évaluation hiérarchique')
        toast({ title: 'Erreur', description: message, variant: 'destructive' })
        return
      }
      setManagerEvalDone((prev) => ({ ...prev, [rec._id]: true }))
      toast({ title: 'Évaluation enregistrée', description: 'Les notes post-activité ont été sauvegardées.', variant: 'success' })
    } finally {
      setManagerEvalLoading((prev) => ({ ...prev, [rec._id]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{activity.title}</h1>
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void bulkDecide('approve')}
            disabled={processingAll || actionableRecs.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => void bulkDecide('reject')}
            disabled={processingAll || actionableRecs.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="reveal-grid grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><span className="text-xs font-medium text-muted-foreground">Type</span><div className="mt-1"><StatusBadge status={activity.type} /></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><span className="text-xs font-medium text-muted-foreground">Places</span><p className="mt-1 text-lg font-bold text-card-foreground">{activity.seats}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><span className="text-xs font-medium text-muted-foreground">Date</span><p className="mt-1 text-sm font-medium text-card-foreground">{activity.date}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><span className="text-xs font-medium text-muted-foreground">Lieu</span><p className="mt-1 text-sm font-medium text-card-foreground">{activity.location}</p></div>
      </div>

      <div className="reveal reveal-right rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">Competences requises</h3>
        <div className="flex flex-wrap gap-2">
          {activity.required_skills.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-sm font-medium text-card-foreground">{s.skill_name}</span>
              <StatusBadge status={s.desired_level} />
              <span className="text-xs text-muted-foreground">({Math.round((s.weight ?? 0) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="reveal reveal-scale rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Employes recommandes ({filteredRecs.length}/{recs.length})</h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px]">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Recherche dynamique: nom, email, matricule"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ApiRecommendation['status'])}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">Tous statuts</option>
                <option value="PENDING">PENDING</option>
                <option value="HR_APPROVED">HR_APPROVED</option>
                <option value="SENT_TO_MANAGER">SENT_TO_MANAGER</option>
                <option value="HR_REJECTED">HR_REJECTED</option>
                <option value="MANAGER_APPROVED">MANAGER_APPROVED</option>
                <option value="MANAGER_REJECTED">MANAGER_REJECTED</option>
                <option value="NOTIFIED">NOTIFIED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="DECLINED">DECLINED</option>
              </select>
            </div>
          </div>
        </div>
        {loadingRecs ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Chargement des recommandations...</p>
        ) : filteredRecs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune recommandation disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Rang</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Employe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Score Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">NLP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Competences</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecs.map((rec) => {
                  const recAny = rec as any
                  const employeeId =
                    typeof rec.userId === 'string'
                      ? (looksLikeObjectId(rec.userId) ? rec.userId : String(recAny.employee_id ?? ''))
                      : String(rec.userId?._id ?? recAny.employee_id ?? '')
                  const userInfo =
                    typeof rec.userId === 'string'
                      ? {
                          _id: employeeId,
                          name: looksLikeObjectId(rec.userId) ? String(recAny.employee_name ?? 'Employe') : rec.userId,
                          email: String(recAny.employee_email ?? '-'),
                          matricule: String(recAny.employee_matricule ?? '-'),
                        }
                      : rec.userId
                  const canDecide = ['PENDING', 'HR_APPROVED', 'SENT_TO_MANAGER'].includes(String(rec.status))
                  const canPostEval = ['EMPLOYEE_CONFIRMED', 'ACCEPTED'].includes(String(rec.status))
                  return (
                    <tr key={rec._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Medal className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{rec.rank}</span></div></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {userInfo.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-card-foreground">{userInfo.name}</span>
                            <span className="text-xs text-muted-foreground">{userInfo.email} · {userInfo.matricule}</span>
                          </div>
                        </div>
                        {rec.parsed_activity?.description && <p className="mt-1 text-xs text-muted-foreground">{rec.parsed_activity.description}</p>}
                        {rec.parsed_activity?.required_skills && rec.parsed_activity.required_skills.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {rec.parsed_activity.required_skills.map((s, idx) => (
                              <span key={`${rec._id}-${idx}`} className="rounded-full bg-muted px-2 py-1 text-[11px] text-foreground">
                                {s.intitule} niv {s.niveau_requis} ({Math.round((s.poids ?? 0) * 100)}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatScorePercent(rec.score_total)}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm font-medium">{formatScorePercent(rec.score_nlp)}</span></div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">{formatScorePercent(rec.score_competences)}</span></div></td>
                      <td className="px-4 py-3">
                        <StatusBadge status={String(rec.status).toLowerCase()} />
                        {rec.absence_reason && <p className="mt-1 text-[11px] text-destructive">Motif: {rec.absence_reason}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => void loadProfile(employeeId)}
                            disabled={!employeeId}
                            className="flex items-center justify-center rounded-lg border border-border p-2 hover:bg-accent disabled:opacity-50"
                            title="Voir profil"
                          >
                            <User className="h-4 w-4" />
                          </button>
                          {canDecide && (
                            <>
                              <button onClick={() => void decide(rec._id, 'approve')} className="flex items-center justify-center rounded-lg bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200" title="Accepter"><Check className="h-4 w-4" /></button>
                              <button onClick={() => void decide(rec._id, 'reject')} className="flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200" title="Rejeter"><X className="h-4 w-4" /></button>
                            </>
                          )}
                          <button
                            onClick={() => void sendInvitationEmail(employeeId)}
                            disabled={rec.status !== 'MANAGER_APPROVED' || sendingEmail[employeeId] || !employeeId}
                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                              rec.status === 'MANAGER_APPROVED' && !sendingEmail[employeeId]
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : rec.status === 'NOTIFIED'
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            } disabled:opacity-50`}
                          >
                            <Mail className="h-3.5 w-3.5" /> 
                            {sendingEmail[employeeId]
                              ? 'Envoi...' 
                              : rec.status === 'NOTIFIED' 
                              ? 'Email envoyé ✓' 
                              : 'Envoyer Email'}
                          </button>
                          {canPostEval && (
                            <button
                              onClick={() => void submitManagerEval(rec)}
                              disabled={!!managerEvalLoading[rec._id]}
                              className="rounded-lg border border-violet-400 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                              title="Enregistrer l'évaluation hiérarchique post-activité"
                            >
                              {managerEvalLoading[rec._id] ? 'Envoi...' : 'Eval post-activité'}
                            </button>
                          )}
                          {managerEvalDone[rec._id] && (
                            <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                              Envoyé ✓
                            </span>
                          )}
                        </div>
                        {canPostEval && (rec.parsed_activity?.required_skills?.length ?? 0) > 0 && (
                          <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                            {(rec.parsed_activity?.required_skills ?? []).map((s) => (
                              <label key={`${rec._id}-${s.intitule}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-[11px]">
                                <span>{s.intitule}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={managerEvalInputs?.[rec._id]?.[s.intitule] ?? ''}
                                  onChange={(e) => setManagerEvalValue(rec._id, s.intitule, Number(e.target.value))}
                                  className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-[11px]"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {profileModal.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-card-foreground">Profil employe</h3>
              <button onClick={() => setProfileModal({ open: false })} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent">Fermer</button>
            </div>
            {!profileModal.data ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium">{profileModal.data?.employee?.name ?? 'N/A'} ({profileModal.data?.employee?.matricule ?? '-'})</p>
                  <p className="text-xs text-muted-foreground">Email: {profileModal.data?.employee?.email ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Telephone: {profileModal.data?.employee?.telephone ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Fiches trouvées: {Array.isArray(profileModal.data?.fiches) ? profileModal.data.fiches.length : 0}</p>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border border-border">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-muted/50"><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Saison</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Etat</th><th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {(Array.isArray(profileModal.data?.fiches) ? profileModal.data.fiches : []).map((f: any, idx: number) => (
                        <tr key={`fiche-${idx}`}>
                          <td className="px-3 py-2 text-sm">{String(f?.saisons ?? '-')}</td>
                          <td className="px-3 py-2 text-sm">{String(f?.etat ?? '-')}</td>
                          <td className="px-3 py-2 text-sm">{f?.createdAt ? new Date(f.createdAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
