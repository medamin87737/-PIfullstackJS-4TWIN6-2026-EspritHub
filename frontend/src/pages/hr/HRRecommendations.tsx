import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { ArrowLeft, Sparkles, Send, Brain, Target, Medal, MessageSquare, TrendingUp } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type ApiRecommendation = {
  _id: string
  userId: { _id: string; name: string; email: string; matricule: string } | string
  activityId: string
  score_total: number
  score_nlp: number
  score_competences: number
  score_progression?: number
  score_history?: number
  score_seniority?: number
  recommendation_reason?: string
  rank: number
  status:
    | 'PENDING'
    | 'HR_APPROVED'
    | 'HR_REJECTED'
    | 'MANAGER_APPROVED'
    | 'SENT_TO_MANAGER'
    | 'WAITING_EMPLOYEE_CONFIRMATION'
    | 'MANAGER_REJECTED'
    | 'EMPLOYEE_CONFIRMED'
    | 'EMPLOYEE_DECLINED'
  absence_reason?: string | null
  parsed_activity: {
    titre: string
    description: string
    contexte: string
    required_skills: { intitule: string; niveau_requis: number; poids: number }[]
    top_n: number
  }
  created_at: string
}

type EmployeeOption = {
  id: string
  name: string
  email: string
  matricule: string
}
type SimulationResult = {
  employee_id: string
  name: string
  email: string
  score_total: number
  score_nlp: number
  score_competences: number
  rank: number
}

export default function HRRecommendations() {
  const { activityId } = useParams()
  const navigate = useNavigate()
  const { activities, updateActivity, fetchWithAuth } = useData()
  const { toast } = useToast()
  const [aiRunning, setAiRunning] = useState(false)
  const [promptGenerating, setPromptGenerating] = useState(false)
  const [promptTyping, setPromptTyping] = useState(false)
  const [hrPrompt, setHrPrompt] = useState('')
  const [aiRecs, setAiRecs] = useState<ApiRecommendation[]>([])
  const [parsedActivity, setParsedActivity] = useState<ApiRecommendation['parsed_activity'] | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [simRunning, setSimRunning] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [simResults, setSimResults] = useState<SimulationResult[]>([])
  const [simParsed, setSimParsed] = useState<ApiRecommendation['parsed_activity'] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minScoreFilter, setMinScoreFilter] = useState('')
  const typingTimerRef = useRef<number | null>(null)
  const displayPrompt = promptTyping ? `${hrPrompt}|` : hrPrompt

  const activity = activities.find(a => a.id === activityId)
  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )

  const extractErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') return data.message
      if (Array.isArray(data?.message) && data.message.length > 0) return String(data.message[0])
      return fallback
    } catch {
      const text = await res.text()
      return text || fallback
    }
  }

  const loadRecommendations = async () => {
    if (!activityId || !token) return
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/activity/${activityId}`)
      if (!res.ok) return
      const data = (await res.json()) as ApiRecommendation[]
      setAiRecs(data)
      if (data[0]?.parsed_activity) {
        setParsedActivity(data[0].parsed_activity)
      }
    } catch {
      // ignore silent refresh for first mount
    }
  }

  useEffect(() => {
    loadRecommendations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])

  useEffect(() => {
    const loadEmployees = async () => {
      if (!token) return
      const res = await fetchWithAuth(`${API_BASE_URL}/users`)
      if (!res.ok) return
      const payload = await res.json()
      const rows = Array.isArray(payload?.data) ? payload.data : payload
      const mapped = (Array.isArray(rows) ? rows : [])
        .filter((u: any) => String(u?.role ?? '') === 'EMPLOYEE')
        .map((u: any) => ({
          id: String(u?._id ?? u?.id ?? ''),
          name: String(u?.name ?? 'N/A'),
          email: String(u?.email ?? '-'),
          matricule: String(u?.matricule ?? '-'),
        })) as EmployeeOption[]
      setEmployees(mapped)
    }
    void loadEmployees()
  }, [fetchWithAuth, token])

  const runAI = async () => {
    if (!token) {
      toast({ title: 'Erreur', description: 'Session expirée. Reconnectez-vous.' })
      return
    }
    if (!hrPrompt.trim()) {
      toast({ title: 'Prompt requis', description: 'Veuillez saisir une demande RH.' })
      return
    }
    if (!activityId || !/^[a-f\d]{24}$/i.test(activityId)) {
      toast({ title: 'Activité invalide', description: "L'activité doit être sauvegardée en base avant de lancer l'IA." })
      return
    }
    setAiRunning(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hrPrompt, activityId }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Erreur génération IA')
        throw new Error(message)
      }
      const payload = await res.json()
      setParsedActivity(payload.parsed_activity ?? null)
      await loadRecommendations()
      toast({ title: 'Analyse IA terminée', description: 'Liste recommandée générée et enregistrée.' })
    } catch (err: any) {
      toast({ title: 'Erreur analyse IA', description: err.message || 'Service IA indisponible.' })
    } finally {
      setAiRunning(false)
    }
  }

  const generatePromptFromActivity = async () => {
    if (!token || !activity) {
      toast({ title: 'Erreur', description: 'Session expirée. Reconnectez-vous.' })
      return
    }
    setPromptGenerating(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/chat/generate-activity-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: activity.title,
          description: activity.description,
          type: activity.type,
          priority: activity.priority,
          seats: activity.seats,
          required_skills: activity.required_skills,
          targetLanguage: 'fr',
        }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Génération du prompt impossible')
        throw new Error(message)
      }
      const payload = await res.json()
      const generated = String(payload?.prompt ?? '').trim()
      if (!generated) {
        throw new Error('Le service IA a retourné un prompt vide')
      }
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
      setPromptTyping(true)
      setHrPrompt('')

      await new Promise<void>((resolve) => {
        let idx = 0
        const step = () => {
          idx += 1
          setHrPrompt(generated.slice(0, idx))
          if (idx >= generated.length) {
            if (typingTimerRef.current) {
              window.clearInterval(typingTimerRef.current)
              typingTimerRef.current = null
            }
            setPromptTyping(false)
            resolve()
          }
        }
        const speedMs = 14
        typingTimerRef.current = window.setInterval(step, speedMs)
      })
      toast({
        title: 'Prompt généré',
        description: 'Le prompt RH a été généré automatiquement selon l’activité.',
      })
    } catch (err: any) {
      toast({
        title: 'Erreur génération prompt',
        description: err.message ?? 'Service IA indisponible.',
        variant: 'destructive',
      })
    } finally {
      if (typingTimerRef.current === null) {
        setPromptTyping(false)
      }
      setPromptGenerating(false)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current)
      }
    }
  }, [])

  const sendToManager = async () => {
    if (!token || !activityId || !activity) {
      toast({ title: 'Erreur', description: 'Session expirée. Reconnectez-vous.' })
      return
    }
    try {
      const decisions = aiRecs
        .filter((r) => r.status === 'PENDING')
        .map((r) => ({ recommendationId: r._id, action: 'approve' as const }))

      if (decisions.length === 0) {
        toast({ title: 'Aucune recommandation', description: 'Lancez l’analyse IA pour générer une liste recommandée.' })
        return
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/hr-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activityId, decisions }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Envoi au manager impossible')
        throw new Error(message)
      }
      const payload = await res.json()
      const approved = Array.isArray(payload) ? payload.filter((r: ApiRecommendation) => r.status === 'HR_APPROVED').length : 0
      updateActivity({ ...activity, status: 'in_progress' })
      await loadRecommendations()
      toast({
        title: 'Validation RH terminée',
        description: `${approved} recommandation(s) validée(s) et transmise(s) au manager du département.`,
      })
    } catch (err: any) {
      toast({ title: 'Erreur validation RH', description: err.message ?? 'Transmission au manager impossible.' })
    }
  }

  const runSimulation = async () => {
    if (!token) return
    if (!hrPrompt.trim()) {
      toast({ title: 'Prompt requis', description: 'Veuillez saisir une demande RH.' })
      return
    }
    setSimRunning(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, hrPrompt, mode: 'what-if' }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Simulation impossible')
        throw new Error(message)
      }
      const payload = await res.json()
      setSimParsed(payload?.parsed_activity ?? null)
      setSimResults(Array.isArray(payload?.recommendations) ? payload.recommendations : [])
      toast({ title: 'Simulation terminée', description: 'Scénario évalué sans sauvegarde.' })
    } catch (err: any) {
      toast({ title: 'Erreur simulation', description: err.message ?? 'Simulation impossible.', variant: 'destructive' })
    } finally {
      setSimRunning(false)
    }
  }

  const declinedRecs = aiRecs.filter((r) => r.status === 'EMPLOYEE_DECLINED')
  const filteredEmployees = employees
    .filter((e) => {
      const q = employeeQuery.trim().toLowerCase()
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q)
      )
    })
    .slice(0, 30)

  const addEmployeeManually = async () => {
    if (!activityId || !selectedEmployeeId) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/manual-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, employeeId: selectedEmployeeId, note: 'Ajout manuel RH' }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Ajout manuel impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    setSelectedEmployeeId('')
    await loadRecommendations()
    toast({ title: 'Ajustement appliqué', description: 'Employé ajouté à la liste recommandée.' })
  }

  const removeRecommendation = async (recommendationId: string) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/${recommendationId}`, { method: 'DELETE' })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Suppression impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    await loadRecommendations()
    toast({ title: 'Ajustement appliqué', description: 'Recommandation retirée de la liste.' })
  }

  const runAdvancedSearch = async () => {
    if (!token) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId,
        query: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
        minScore: minScoreFilter ? Number(minScoreFilter) / 100 : undefined,
      }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Recherche avancée impossible')
      toast({ title: 'Erreur recherche', description: message, variant: 'destructive' })
      return
    }
    const rows = await res.json()
    const mapped = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      _id: r.id,
      userId: {
        _id: r.employee?.id ?? '',
        name: r.employee?.name ?? 'N/A',
        email: r.employee?.email ?? '',
        matricule: r.employee?.matricule ?? '',
      },
      activityId: r.activity?.id ?? activityId ?? '',
      score_total: Number(r.score_total ?? 0),
      score_nlp: Number(r.score_nlp ?? 0),
      score_competences: Number(r.score_competences ?? 0),
      score_progression: Number(r.score_progression ?? 0),
      score_history: Number(r.score_history ?? 0),
      score_seniority: Number(r.score_seniority ?? 0),
      recommendation_reason: String(r.recommendation_reason ?? ''),
      rank: Number(r.rank ?? 0),
      status: r.status,
      parsed_activity: parsedActivity ?? { titre: '', description: '', contexte: '', required_skills: [], top_n: 10 },
      created_at: new Date().toISOString(),
    })) as ApiRecommendation[]
    setAiRecs(mapped)
    toast({ title: 'Recherche avancée', description: `${mapped.length} résultat(s) trouvés.` })
  }

  const triggerRetrain = async () => {
    if (!token) return
    setRetraining(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/retrain-ai`, { method: 'POST' })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Relance apprentissage IA impossible')
        throw new Error(message)
      }
      const payload = await res.json()
      toast({ title: 'Retraining IA', description: payload?.message ?? 'Apprentissage IA relancé avec succès.' })
    } catch (err: any) {
      toast({ title: 'Erreur retraining IA', description: err.message ?? 'Relance apprentissage IA impossible.', variant: 'destructive' })
    } finally {
      setRetraining(false)
    }
  }

  if (!activity) return <div className="p-8 text-center text-muted-foreground">Activite non trouvee</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Validation des recommandations RH</h1>
          <p className="text-sm text-muted-foreground">{activity.title}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} disabled={aiRunning}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50">
            {aiRunning ? <Brain className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
            {aiRunning ? 'Analyse en cours...' : 'Lancer IA'}
          </button>
          <button onClick={sendToManager}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90">
            <Send className="h-4 w-4" /> Valider et transmettre au manager
          </button>
          <button onClick={runSimulation} disabled={simRunning}
            className="flex items-center gap-2 rounded-lg border border-indigo-600 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {simRunning ? 'Simulation...' : 'Simuler un scénario'}
          </button>
          <button onClick={triggerRetrain} disabled={retraining}
            className="flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">
            <Brain className="h-4 w-4" /> {retraining ? 'Retraining...' : 'Retraining IA'}
          </button>
        </div>
      </div>

      <div className="reveal reveal-right rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Prompt RH
          </label>
          <button
            onClick={generatePromptFromActivity}
            disabled={promptGenerating}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {promptGenerating ? 'Génération...' : 'Générer prompt auto'}
          </button>
        </div>
        <textarea
          value={displayPrompt}
          onChange={(e) => setHrPrompt(e.target.value.replace(/\|$/, ''))}
          placeholder='Ex: Trouve 5 profils React niveau 5 et leadership niveau 3 pour une formation avancée frontend.'
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {promptTyping && (
          <p className="mt-2 text-xs text-primary">Generation IA en cours...</p>
        )}
      </div>

      <div className="reveal reveal-scale rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-card-foreground">Ajuster la liste recommandée</label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={employeeQuery}
            onChange={(e) => setEmployeeQuery(e.target.value)}
            placeholder="Rechercher employé (nom, email, matricule)"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Choisir un employé</option>
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} - {e.matricule}
              </option>
            ))}
          </select>
          <button
            onClick={addEmployeeManually}
            disabled={!selectedEmployeeId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Ajouter à la liste
          </button>
        </div>
      </div>

      <div className="reveal reveal-right rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-card-foreground">Recherche avancée</label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_140px_auto]">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom, email, matricule"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Tous les statuts</option>
            <option value="PENDING">PENDING</option>
            <option value="HR_APPROVED">HR_APPROVED</option>
            <option value="HR_REJECTED">HR_REJECTED</option>
            <option value="NOTIFIED">NOTIFIED</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="DECLINED">DECLINED</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(e.target.value)}
            placeholder="Score min %"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button onClick={runAdvancedSearch} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            Rechercher
          </button>
        </div>
      </div>

      {/* Activity summary */}
      <div className="reveal-grid grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <div className="mt-1"><StatusBadge status={activity.type} /></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Places</span>
          <p className="mt-1 text-lg font-bold text-card-foreground">{activity.seats}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Priorite</span>
          <div className="mt-1"><StatusBadge status={activity.priority} /></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Recommandes</span>
          <p className="mt-1 text-lg font-bold text-card-foreground">{aiRecs.length}</p>
        </div>
      </div>

      {/* AI processing animation */}
      {aiRunning && (
        <div className="flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Brain className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-primary/50" />
            </div>
            <p className="text-sm font-medium text-primary">Analyse NLP des profils en cours...</p>
            <p className="text-xs text-muted-foreground">Extraction des competences et matching semantique</p>
          </div>
        </div>
      )}

      {/* Recommendations table */}
      {aiRecs.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-card-foreground">Employés classés (Top-N)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Rang</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Employé</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Score Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Score NLP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Score Compétences</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aiRecs.map(rec => {
                  const userInfo =
                    typeof rec.userId === 'string'
                      ? { name: rec.userId, email: '-', matricule: '-' }
                      : rec.userId
                  return (
                    <tr key={rec._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Medal className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{rec.rank}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {userInfo.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-card-foreground">{userInfo.name}</span>
                            <span className="text-xs text-muted-foreground">{userInfo.email} · {userInfo.matricule}</span>
                            {rec.recommendation_reason && (
                              <span className="text-[11px] text-muted-foreground">{rec.recommendation_reason}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{(rec.score_total * 100).toFixed(1)}%</span>
                          <span className="text-[11px] text-muted-foreground">
                            Sem {(Number(rec.score_nlp ?? 0) * 100).toFixed(0)}% · Skill {(Number(rec.score_competences ?? 0) * 100).toFixed(0)}% ·
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Prog {(Number(rec.score_progression ?? 0) * 100).toFixed(0)}% · Hist {(Number(rec.score_history ?? 0) * 100).toFixed(0)}% · Sen {(Number(rec.score_seniority ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{(rec.score_nlp * 100).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600">{(rec.score_competences * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rec.status.toLowerCase()} />
                        {rec.absence_reason && (
                          <p className="mt-1 text-[11px] text-destructive">Motif: {rec.absence_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {['PENDING', 'HR_APPROVED', 'HR_REJECTED'].includes(rec.status) ? (
                          <button
                            onClick={() => removeRecommendation(rec._id)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                          >
                            Retirer de la liste
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {declinedRecs.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-card-foreground">Refus employés (motifs)</h3>
          <div className="space-y-2">
            {declinedRecs.map((rec) => {
              const userInfo =
                typeof rec.userId === 'string'
                  ? { name: rec.userId, email: '-', matricule: '-' }
                  : rec.userId
              return (
                <div key={`declined-${rec._id}`} className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className="text-sm font-medium text-card-foreground">{userInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{userInfo.email} · {userInfo.matricule}</p>
                  <p className="mt-1 text-xs text-destructive">
                    Motif: {rec.absence_reason || 'Aucun motif saisi'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Parsed activity details from SkillUpTn */}
      {parsedActivity && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground">Activité parsée par SkillUpTn</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{parsedActivity.titre}</span> · {parsedActivity.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {parsedActivity.required_skills.map((s, idx) => (
              <div key={`${s.intitule}-${idx}`} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <span className="font-medium">{s.intitule}</span> · niveau {s.niveau_requis} · poids {(s.poids * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </div>
      )}

      {simResults.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground">Résultats simulation (non sauvegardés)</h3>
          {simParsed && (
            <p className="mb-3 text-xs text-muted-foreground">
              {simParsed.titre} · {simParsed.description}
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Rang</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Employé</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Score total</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">NLP</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Compétences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {simResults.map((r) => (
                  <tr key={`sim-${r.employee_id}-${r.rank}`} className="hover:bg-muted/30">
                    <td className="px-4 py-2 text-sm font-semibold">{r.rank}</td>
                    <td className="px-4 py-2 text-sm">{r.name} <span className="text-xs text-muted-foreground">({r.email})</span></td>
                    <td className="px-4 py-2 text-sm font-semibold">{(r.score_total * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-sm">{(r.score_nlp * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-sm">{(r.score_competences * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
