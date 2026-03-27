import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { ArrowLeft, Sparkles, Send, Zap, Target, Medal, MessageSquare, TrendingUp } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type ApiRecommendation = {
  _id: string
  userId: { _id: string; name: string; email: string; matricule: string } | string
  hr_prompt?: string
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
    required_skills?: { intitule: string; niveau_requis: number; poids: number }[]
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
type InlineNotice = { type: 'success' | 'error'; message: string } | null
type SkillOption = { intitule: string; type?: string; source?: 'competence' | 'question' }

function normalizeParsedActivity(raw: any): ApiRecommendation['parsed_activity'] | null {
  if (!raw || typeof raw !== 'object') return null
  const requiredSkills = Array.isArray(raw.required_skills) ? raw.required_skills : []
  return {
    titre: String(raw.titre ?? raw.title ?? ''),
    description: String(raw.description ?? ''),
    contexte: String(raw.contexte ?? ''),
    required_skills: requiredSkills.map((s: any) => ({
      intitule: String(s?.intitule ?? s?.skill_name ?? ''),
      niveau_requis: Number(s?.niveau_requis ?? 0),
      poids: Number(s?.poids ?? 0),
    })),
    top_n: Number(raw.top_n ?? 0),
  }
}

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

function normalizeSkillKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function extractMissingSkillsFromError(errorMessage: string): string[] {
  const msg = String(errorMessage ?? '').trim()
  if (!msg) return []
  const direct = msg.match(/comp[eé]tence\(s\)\s+non\s+trouv[ée]e\(s\)\s*:\s*([^\n]+)/i)?.[1]
  const candidate = String(direct ?? msg)
    .replace(/v[eé]rifiez.*$/i, '')
    .replace(/donn[eé]es.*$/i, '')
    .replace(/\.$/, '')
    .trim()
  if (!candidate) return []
  return candidate
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

function extractTopNFromPrompt(prompt: string): number | null {
  const text = String(prompt ?? '')
  const structured = text.match(/\btop[_\s-]*n\s*[:=]?\s*(\d{1,4})\b/i)?.[1]
  const natural = text.match(/\b(trouver|trouve|chercher|cherche|identifier|identifie)\s+(\d{1,4})\s+profils?\b/i)?.[2]
  const raw = Number(structured ?? natural ?? 0)
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.max(1, Math.min(500, raw))
}

function extractPromptSkillCandidates(prompt: string): string[] {
  const text = String(prompt ?? '')
  if (!text.trim()) return []

  const cleanSkill = (raw: string): string => {
    return String(raw ?? '')
      .replace(/^[\s\-•*–—]+/, '')
      .replace(/[.,;:!?]+$/g, '')
      .replace(/\s*(niveau|level|niv|lvl|n\.?)\s*[1-5]\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const bulletMatches = Array.from(text.matchAll(/^\s*-\s*([^\n]+)/gim))
    .map((m) => cleanSkill(String(m?.[1] ?? '')))
    .filter(Boolean)

  const lineMatches = Array.from(text.matchAll(/(?:^|[\n;])\s*([^\n;]{2,120}?)\s*(?:niveau|level|niv|lvl|n\.?)\s*[1-5]/gi))
    .map((m) => cleanSkill(String(m?.[1] ?? '')))
    .filter(Boolean)

  const splitCompoundSkills = (value: string): string[] => {
    const v = cleanSkill(value)
    if (!v) return []
    // Handle "Docker Kubernetes" style prompts by splitting only when separators are explicit.
    const parts = v
      .split(/\s*(?:\/|\||\bet\b|&)\s*/i)
      .map((p) => cleanSkill(p))
      .filter(Boolean)
    return parts.length > 0 ? parts : [v]
  }

  const merged = [...bulletMatches, ...lineMatches].flatMap(splitCompoundSkills)
  const unique = new Map<string, string>()
  for (const s of merged) {
    const key = normalizeSkillKey(s)
    if (!key) continue
    if (!unique.has(key)) unique.set(key, s)
  }
  return Array.from(unique.values())
}

export default function HRRecommendations() {
  const { activityId } = useParams()
  const navigate = useNavigate()
  const { activities, updateActivity, fetchWithAuth } = useData()
  const { toast } = useToast()
  const [aiRunning, setAiRunning] = useState(false)
  const [promptGenerating, setPromptGenerating] = useState(false)
  const [promptTyping, setPromptTyping] = useState(false)
  const [promptPreview, setPromptPreview] = useState('')
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [hrPrompt, setHrPrompt] = useState('')
  const [aiRecs, setAiRecs] = useState<ApiRecommendation[]>([])
  const [parsedActivity, setParsedActivity] = useState<ApiRecommendation['parsed_activity'] | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [simRunning, setSimRunning] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [inlineNotice, setInlineNotice] = useState<InlineNotice>(null)
  const [skillPickerOpen, setSkillPickerOpen] = useState(false)
  const [missingSkills, setMissingSkills] = useState<string[]>([])
  const [selectedMissingSkill, setSelectedMissingSkill] = useState('')
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [allSkills, setAllSkills] = useState<SkillOption[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedSkillLevel, setSelectedSkillLevel] = useState(3)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDetails, setNewSkillDetails] = useState('')
  const [newSkillType, setNewSkillType] = useState<'knowledge' | 'know_how' | 'soft_skills'>('knowledge')
  const [declinePenalty, setDeclinePenalty] = useState(0.05)
  const [expandedDeclinedId, setExpandedDeclinedId] = useState<string | null>(null)
  const [declinedReviewChoice, setDeclinedReviewChoice] = useState<Record<string, 'decrease' | 'keep'>>({})
  const [simResults, setSimResults] = useState<SimulationResult[]>([])
  const [simParsed, setSimParsed] = useState<ApiRecommendation['parsed_activity'] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [minScoreFilter, setMinScoreFilter] = useState('')
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const [missingSeats, setMissingSeats] = useState(0)
  const typingTimerRef = useRef<number | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const previewHideTimerRef = useRef<number | null>(null)
  const showNotice = (type: 'success' | 'error', message: string) => {
    setInlineNotice({ type, message })
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      setInlineNotice(null)
      noticeTimerRef.current = null
    }, 4200)
  }

  const appendSkillToPrompt = (skill: string, level = 3) => {
    const clean = String(skill ?? '').trim()
    if (!clean) return
    const line = `- ${clean} niveau ${Math.max(1, Math.min(5, Number(level) || 3))}`
    setHrPrompt((prev) => {
      const base = String(prev ?? '').trim()
      if (!base) return line
      return `${base}\n${line}`
    })
    showNotice('success', `Compétence ajoutée: ${clean}`)
  }

  const loadAllSkills = async () => {
    setSkillsLoading(true)
    try {
      const [resCompetences, resQuestions] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/users/competences/all`),
        fetchWithAuth(`${API_BASE_URL}/users/question-competences/all`),
      ])
      if (!resCompetences.ok) throw new Error(`Erreur chargement compétences (${resCompetences.status})`)
      if (!resQuestions.ok) throw new Error(`Erreur chargement banque compétences (${resQuestions.status})`)
      const payloadCompetences = await resCompetences.json()
      const payloadQuestions = await resQuestions.json()
      const rowsCompetences = Array.isArray(payloadCompetences?.data)
        ? payloadCompetences.data
        : (Array.isArray(payloadCompetences) ? payloadCompetences : [])
      const rowsQuestions = Array.isArray(payloadQuestions?.data)
        ? payloadQuestions.data
        : (Array.isArray(payloadQuestions) ? payloadQuestions : [])

      const mappedFromCompetences = rowsCompetences
        .map((r: any) => ({
          intitule: String(r?.intitule ?? r?.name ?? '').trim(),
          type: r?.type ? String(r.type) : undefined,
          source: 'competence' as const,
        }))
        .filter((x: SkillOption) => x.intitule.length > 0)

      const mappedFromQuestions = rowsQuestions
        .map((q: any) => ({
          intitule: String(q?.intitule ?? '').trim(),
          type: q?.type ? String(q.type) : undefined,
          source: 'question' as const,
        }))
        .filter((x: SkillOption) => x.intitule.length > 0)

      const unique = Array.from(
        new Map([...mappedFromCompetences, ...mappedFromQuestions].map((x: SkillOption) => [x.intitule.toLowerCase(), x])).values(),
      )
      setAllSkills(unique.sort((a, b) => a.intitule.localeCompare(b.intitule)))
    } catch (e: any) {
      showNotice('error', String(e?.message ?? 'Impossible de charger les compétences'))
    } finally {
      setSkillsLoading(false)
    }
  }

  const createMissingSkill = async () => {
    const name = newSkillName.trim()
    if (!name) {
      showNotice('error', 'Saisissez un nom de compétence à créer.')
      return
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/users/question-competences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intitule: name,
          details: newSkillDetails.trim(),
          status: 'active',
          type: newSkillType,
        }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Création de compétence impossible')
        throw new Error(message)
      }
      setNewSkillName('')
      setNewSkillDetails('')
      await loadAllSkills()
      appendSkillToPrompt(name, selectedSkillLevel)
      showNotice('success', `Compétence créée et ajoutée au prompt: ${name}`)
    } catch (e: any) {
      showNotice('error', String(e?.message ?? 'Création de compétence impossible'))
    }
  }

  const sortedAiRecs = useMemo(
    () =>
      [...aiRecs].sort((a, b) => {
        const scoreDiff = normalizeScore(b.score_total) - normalizeScore(a.score_total)
        if (Math.abs(scoreDiff) > 0.00001) return scoreDiff
        return Number(a.rank ?? 0) - Number(b.rank ?? 0)
      }),
    [aiRecs],
  )

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
        setParsedActivity(normalizeParsedActivity(data[0].parsed_activity))
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
    // Preload skills so prompt normalization can map to DB labels before IA call.
    void loadAllSkills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      showNotice('error', 'Session expirée. Reconnectez-vous.')
      return
    }
    if (!hrPrompt.trim()) {
      toast({ title: 'Prompt requis', description: 'Veuillez saisir une demande RH.' })
      showNotice('error', 'Prompt requis: veuillez saisir une demande RH.')
      return
    }
    if (!activityId || !/^[a-f\d]{24}$/i.test(activityId)) {
      toast({ title: 'Activité invalide', description: "L'activité doit être sauvegardée en base avant de lancer l'IA." })
      showNotice('error', "Activité invalide: sauvegardez l'activité en base avant de lancer l'IA.")
      return
    }
    const candidates = extractPromptSkillCandidates(hrPrompt)
    if (candidates.length > 0 && allSkills.length > 0) {
      const available = new Set(allSkills.map((s) => normalizeSkillKey(s.intitule)).filter(Boolean))
      const missingFromPrompt = candidates.filter((c) => !available.has(normalizeSkillKey(c)))
      if (missingFromPrompt.length > 0) {
        setMissingSkills(missingFromPrompt)
        setSelectedMissingSkill(missingFromPrompt[0])
        setSkillSearch(missingFromPrompt[0])
        setSkillPickerOpen(true)
        toast({
          title: 'Compétences introuvables',
          description: `Vérifiez: ${missingFromPrompt.slice(0, 4).join(', ')}${missingFromPrompt.length > 4 ? ', ...' : ''}`,
          variant: 'destructive',
        })
        showNotice('error', `Compétence(s) non trouvée(s): ${missingFromPrompt.join(', ')}`)
        return
      }
    }
    setAiRunning(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Persist exactly what HR typed; keep normalized form only for local checks/diagnostics.
        body: JSON.stringify({ hrPrompt, activityId }),
      })
      if (!res.ok) {
        const message = await extractErrorMessage(res, 'Erreur génération IA')
        throw new Error(message)
      }
      const payload = await res.json()
      setParsedActivity(normalizeParsedActivity(payload.parsed_activity))
      await loadRecommendations()
      const requestedTopN = extractTopNFromPrompt(hrPrompt)
      const totalAnalyzed = Number(payload?.total_employees_analyzed ?? 0)
      const generatedCount = Array.isArray(payload?.recommendations) ? payload.recommendations.length : 0
      const details = requestedTopN
        ? `Demandé: ${requestedTopN} | Disponible: ${totalAnalyzed} | Retourné: ${generatedCount}`
        : `Disponible: ${totalAnalyzed} | Retourné: ${generatedCount}`
      toast({ title: 'Analyse IA terminée', description: `Liste recommandée générée et enregistrée. ${details}`, variant: 'success' })
      showNotice('success', `Recommandations générées avec succès. ${details}`)
    } catch (err: any) {
      toast({ title: 'Erreur analyse IA', description: err.message || 'Service IA indisponible.' })
      showNotice('error', String(err?.message || 'Service IA indisponible.'))
      const errText = String(err?.message ?? '').toLowerCase()
      if (errText.includes('compétence') || errText.includes('competence')) {
        const missing = extractMissingSkillsFromError(String(err?.message ?? ''))
        if (missing.length > 0) {
          setMissingSkills((prev) => {
            const map = new Map<string, string>()
            for (const s of prev) map.set(normalizeSkillKey(s), s)
            for (const s of missing) map.set(normalizeSkillKey(s), s)
            return Array.from(map.values())
          })
          setSelectedMissingSkill(missing[0])
          setSkillSearch(missing[0])
        }
        setSkillPickerOpen(true)
        void loadAllSkills()
      }
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
      const levelToNiveau = (desired: unknown): number => {
        const key = String(desired ?? '').trim().toLowerCase()
        if (key === 'low') return 2
        if (key === 'high') return 4
        if (key === 'expert') return 5
        return 3
      }

      const skillLines = (Array.isArray(activity.required_skills) ? activity.required_skills : [])
        .map((s: any) => {
          const name = String(s?.skill_name ?? s?.intitule ?? '').trim()
          if (!name) return ''
          const niveau = Number.isFinite(Number(s?.niveau_requis))
            ? Math.max(1, Math.min(5, Number(s.niveau_requis)))
            : levelToNiveau(s?.desired_level)
          return `- ${name} niveau ${niveau}`
        })
        .filter(Boolean)

      const generated = [
        `Top_n: ${Math.max(1, Math.min(200, Number(activity.seats ?? 10) || 10))}`,
        'Compétences obligatoires et niveaux cibles:',
        ...(skillLines.length > 0 ? skillLines : ['- Communication professionnelle niveau 3']),
        `Contexte activité: ${String(activity.title ?? '').trim() || 'Activité sans titre'}`,
        `Description: ${String(activity.description ?? '').trim() || 'Aucune description fournie'}`,
      ].join('\n')

      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
      setPromptTyping(true)
      setShowPromptPreview(true)
      setPromptPreview('')
      if (previewHideTimerRef.current) {
        window.clearTimeout(previewHideTimerRef.current)
        previewHideTimerRef.current = null
      }

      await new Promise<void>((resolve) => {
        let idx = 0
        const step = () => {
          idx += 1
          setPromptPreview(generated.slice(0, idx))
          if (idx >= generated.length) {
            if (typingTimerRef.current) {
              window.clearInterval(typingTimerRef.current)
              typingTimerRef.current = null
            }
            setHrPrompt(generated)
            setPromptTyping(false)
            previewHideTimerRef.current = window.setTimeout(() => {
              setShowPromptPreview(false)
              previewHideTimerRef.current = null
            }, 260)
            resolve()
          }
        }
        const speedMs = 14
        typingTimerRef.current = window.setInterval(step, speedMs)
      })
      toast({
        title: 'Prompt généré',
        description: 'Prompt généré en format court et strict pour le moteur IA.',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Erreur génération prompt',
        description: err.message ?? 'Génération du prompt impossible.',
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
      if (previewHideTimerRef.current) {
        window.clearTimeout(previewHideTimerRef.current)
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  const sendToManager = async (forcePartial = false) => {
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

      const targetSeats = Math.max(1, Number(activity.seats ?? 0) || 1)
      const remaining = Math.max(0, targetSeats - decisions.length)
      if (!forcePartial && remaining > 0) {
        setMissingSeats(remaining)
        setConfirmSendOpen(true)
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
      const nextStatus = approved >= Math.max(1, Number(activity.seats ?? 0) || 1) ? 'completed' : 'in_progress'
      updateActivity({ ...activity, status: nextStatus })
      await loadRecommendations()
      toast({
        title: 'Validation RH terminée',
        description:
          nextStatus === 'completed'
            ? `${approved} recommandation(s) validée(s). Événement confirmé (places complètes).`
            : `${approved} recommandation(s) validée(s) et transmise(s) au manager du département.`,
        variant: 'success',
        className: 'ring-2 ring-black/80 border-black/80 animate-[toast-pop-in_320ms_cubic-bezier(0.22,1,0.36,1)]',
      })
      showNotice(
        'success',
        nextStatus === 'completed'
          ? 'Événement confirmé: toutes les places sont couvertes.'
          : 'Transmission au manager effectuée avec succès.',
      )
      await applyDeclinedReviewDecisions()
      setConfirmSendOpen(false)
      setMissingSeats(0)
    } catch (err: any) {
      toast({ title: 'Erreur validation RH', description: err.message ?? 'Transmission au manager impossible.' })
      showNotice('error', String(err?.message ?? 'Transmission au manager impossible.'))
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
      setSimParsed(normalizeParsedActivity(payload?.parsed_activity))
      setSimResults(Array.isArray(payload?.recommendations) ? payload.recommendations : [])
      toast({ title: 'Simulation terminée', description: 'Scénario évalué sans sauvegarde.' })
    } catch (err: any) {
      toast({ title: 'Erreur simulation', description: err.message ?? 'Simulation impossible.', variant: 'destructive' })
    } finally {
      setSimRunning(false)
    }
  }

  const declinedRecs = sortedAiRecs.filter((r) => r.status === 'EMPLOYEE_DECLINED')
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
  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase()
    const rows = Array.isArray(allSkills) ? allSkills : []
    if (!q) return rows.slice(0, 80)
    return rows.filter((s) => String(s.intitule ?? '').toLowerCase().includes(q)).slice(0, 80)
  }, [allSkills, skillSearch])

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

  const decreaseDeclinedScore = async (recommendationId: string, amount = declinePenalty) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/hr-adjust-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId,
        amount,
        note: 'Motif de refus non convaincant',
      }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Diminution du score impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    await loadRecommendations()
    toast({ title: 'Score ajusté', description: `Le score de cette recommandation a été diminué de ${(amount * 100).toFixed(0)}%.`, variant: 'success' })
  }

  const keepDeclinedScore = async (recommendationId: string) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/hr-keep-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId,
        note: 'Motif de refus jugé convaincant',
      }),
    })
    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Conservation du score impossible')
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      return
    }
    await loadRecommendations()
    toast({ title: 'Score conservé', description: 'Le score de cette recommandation a été conservé.', variant: 'success' })
  }

  const applyDeclinedReviewDecisions = async () => {
    const rows = Object.entries(declinedReviewChoice)
    if (rows.length === 0) return
    let applied = 0
    for (const [recommendationId, action] of rows) {
      if (action === 'decrease') {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/hr-adjust-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-toast-silent': 'true' },
          body: JSON.stringify({
            recommendationId,
            amount: declinePenalty,
            note: 'Motif de refus non convaincant',
          }),
        })
        if (res.ok) applied += 1
      } else {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/hr-keep-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-toast-silent': 'true' },
          body: JSON.stringify({
            recommendationId,
            note: 'Motif de refus jugé convaincant',
          }),
        })
        if (res.ok) applied += 1
      }
    }
    if (applied > 0) {
      setDeclinedReviewChoice({})
      toast({ title: 'Refus traités', description: `${applied} décision(s) RH appliquée(s) après confirmation.`, variant: 'success' })
      await loadRecommendations()
    }
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
      {showPromptPreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[1.5px]">
          <div className="mx-4 w-full max-w-xl rounded-2xl border border-primary/40 bg-card/95 p-5 shadow-2xl">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4 animate-pulse" />
              <p className="text-sm font-semibold">IA en train de rédiger le prompt...</p>
            </div>
            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border/70 bg-background/80 p-4 text-sm leading-6 text-foreground">
              {promptTyping ? `${promptPreview}|` : promptPreview}
            </pre>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
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
            {aiRunning ? <Zap className="h-4 w-4 animate-pulse" /> : <Zap className="h-4 w-4" />}
            {aiRunning ? 'Analyse en cours...' : 'Lancer recommandation'}
          </button>
          <button onClick={() => void sendToManager()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:opacity-90">
            <Send className="h-3.5 w-3.5" /> Envoyer au manager
          </button>
          <button onClick={() => void sendToManager()}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Send className="h-3.5 w-3.5" /> Confirmer activité
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
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
          value={hrPrompt}
          onChange={(e) => setHrPrompt(e.target.value.replace(/\|$/, ''))}
          placeholder='Ex: Trouve 5 profils React niveau 5 et leadership niveau 3 pour une formation avancée frontend.'
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {promptTyping && (
          <p className="mt-2 text-xs text-primary">Generation IA en cours...</p>
        )}
      </div>
      {skillPickerOpen && (
        <div className="rounded-xl border border-red-500/40 bg-red-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-700">Compétence introuvable dans la base</p>
              <p className="text-xs text-red-600">Recherchez une compétence existante puis ajoutez-la au prompt.</p>
            </div>
            <button
              onClick={() => setSkillPickerOpen(false)}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
            >
              Fermer
            </button>
          </div>
          {missingSkills.length > 0 && (
            <div className="mb-3 rounded-lg border border-red-300 bg-red-100 p-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-800">Compétences non trouvées</p>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    onClick={() => {
                      setSelectedMissingSkill(s)
                      setSkillSearch(s)
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${
                      normalizeSkillKey(selectedMissingSkill) === normalizeSkillKey(s)
                        ? 'border-red-800 bg-red-700 text-white'
                        : 'border-red-500 bg-red-600 text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-red-700">
                Cliquez sur une compétence rouge pour la filtrer et la corriger.
              </p>
            </div>
          )}
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Recherche dynamique de compétence"
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <select
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(Number(e.target.value) || 3)}
                className="rounded-lg border border-red-300 bg-white px-2 py-2 text-sm"
              >
                <option value={1}>Niveau 1</option>
                <option value={2}>Niveau 2</option>
                <option value={3}>Niveau 3</option>
                <option value={4}>Niveau 4</option>
                <option value={5}>Niveau 5</option>
              </select>
              <button
                onClick={() => void loadAllSkills()}
                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Actualiser
              </button>
            </div>
          </div>
          <div className="mb-2 rounded-lg border border-red-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">Ajouter une compétence manquante dans la base</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_170px]">
              <input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Nouvelle compétence (ex: React avancé)"
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
              />
              <input
                value={newSkillDetails}
                onChange={(e) => setNewSkillDetails(e.target.value)}
                placeholder="Détails optionnels"
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
              />
              <select
                value={newSkillType}
                onChange={(e) => setNewSkillType((e.target.value as 'knowledge' | 'know_how' | 'soft_skills') ?? 'knowledge')}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
              >
                <option value="knowledge">knowledge</option>
                <option value="know_how">know_how</option>
                <option value="soft_skills">soft_skills</option>
              </select>
              <button
                onClick={() => void createMissingSkill()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 whitespace-nowrap min-w-[170px]"
              >
                Ajouter à la base
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-auto rounded-lg border border-red-200 bg-white">
            {skillsLoading ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Chargement des compétences...</p>
            ) : filteredSkills.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Aucune compétence trouvée</p>
            ) : (
              <div className="divide-y divide-red-100">
                {filteredSkills.map((s, idx) => (
                  <div key={`${s.intitule}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-card-foreground">{s.intitule}</span>
                      {s.type && <span className="text-[11px] text-muted-foreground">{s.type}</span>}
                    </div>
                    <button
                      onClick={() => appendSkillToPrompt(s.intitule, selectedSkillLevel)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="mx-4 w-full max-w-md rounded-xl border border-amber-300 bg-card p-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-card-foreground">Places manquantes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Il reste <span className="font-semibold text-amber-700">{missingSeats}</span> place(s) non couverte(s).
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vous pouvez continuer à collecter des employés, ou confirmer quand même.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmSendOpen(false)
                  setMissingSeats(0)
                }}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                Annuler et continuer
              </button>
              <button
                onClick={() => void sendToManager(true)}
                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
              >
                Confirmer quand même
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
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

      <div className="rounded-xl border border-border bg-card p-4">
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
          <p className="mt-1 text-lg font-bold text-card-foreground">{sortedAiRecs.length}</p>
        </div>
      </div>

      {/* AI processing animation */}
      {aiRunning && (
        <div className="flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Zap className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-primary/50" />
            </div>
            <p className="text-sm font-medium text-primary">Analyse NLP des profils en cours...</p>
            <p className="text-xs text-muted-foreground">Extraction des competences et matching semantique</p>
          </div>
        </div>
      )}

      {/* Recommendations table */}
      {sortedAiRecs.length > 0 && (
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
                {sortedAiRecs.map((rec, idx) => {
                  const userInfo =
                    typeof rec.userId === 'string'
                      ? { name: rec.userId, email: '-', matricule: '-' }
                      : rec.userId
                  return (
                    <tr key={rec._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Medal className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{idx + 1}</span>
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
                          <span className="text-sm font-semibold">{formatScorePercent(rec.score_total)}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Sem {formatScorePercent(rec.score_nlp)} · Skill {formatScorePercent(rec.score_competences)} ·
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Prog {formatScorePercent(rec.score_progression)} · Hist {formatScorePercent(rec.score_history)} · Sen {formatScorePercent(rec.score_seniority)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{formatScorePercent(rec.score_nlp)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600">{formatScorePercent(rec.score_competences)}</span>
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-card-foreground">Refus employés (motifs)</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Pénalité score</span>
              <select
                value={declinePenalty}
                onChange={(e) => setDeclinePenalty(Number(e.target.value) || 0.05)}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs text-amber-700"
              >
                <option value={0.02}>-2%</option>
                <option value={0.05}>-5%</option>
                <option value={0.1}>-10%</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            {declinedRecs.map((rec) => {
              const userInfo =
                typeof rec.userId === 'string'
                  ? { name: rec.userId, email: '-', matricule: '-' }
                  : rec.userId
              const expanded = expandedDeclinedId === rec._id
              const currentChoice = declinedReviewChoice[rec._id]
              return (
                <div key={`declined-${rec._id}`} className="rounded-lg border border-border bg-card px-3 py-2">
                  <button
                    onClick={() => setExpandedDeclinedId((prev) => (prev === rec._id ? null : rec._id))}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{userInfo.name}</p>
                      <p className="text-xs text-muted-foreground">{userInfo.email} · {userInfo.matricule}</p>
                    </div>
                    <span className="text-xs text-primary">{expanded ? 'Masquer' : 'Voir cause'}</span>
                  </button>
                  {expanded && (
                    <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2">
                      <p className="text-xs text-destructive">
                        Motif: {rec.absence_reason || 'Aucun motif saisi'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setDeclinedReviewChoice((prev) => ({ ...prev, [rec._id]: 'decrease' }))}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            currentChoice === 'decrease'
                              ? 'border-amber-700 bg-amber-600 text-white'
                              : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          Diminuer score
                        </button>
                        <button
                          onClick={() => setDeclinedReviewChoice((prev) => ({ ...prev, [rec._id]: 'keep' }))}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            currentChoice === 'keep'
                              ? 'border-emerald-700 bg-emerald-600 text-white'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          Garder score
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                          Cette décision sera appliquée après confirmation de l&apos;événement.
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => void decreaseDeclinedScore(rec._id, declinePenalty)}
                          className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-50"
                        >
                          Appliquer maintenant (diminuer)
                        </button>
                        <button
                          onClick={() => void keepDeclinedScore(rec._id)}
                          className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
                        >
                          Appliquer maintenant (garder)
                        </button>
                      </div>
                    </div>
                  )}
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
            {(parsedActivity.required_skills ?? []).map((s, idx) => (
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
                    <td className="px-4 py-2 text-sm">{formatScorePercent(r.score_nlp)}</td>
                    <td className="px-4 py-2 text-sm">{formatScorePercent(r.score_competences)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {inlineNotice && (
        <div
          className={`fixed bottom-4 right-4 z-[10000] max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-xl ${
            inlineNotice.type === 'success'
              ? 'border border-emerald-500/40 bg-emerald-600 text-white'
              : 'border border-red-500/40 bg-red-600 text-white'
          }`}
        >
          {inlineNotice.message}
        </div>
      )}
    </div>
  )
}
