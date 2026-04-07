import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { Check, X, Calendar, MapPin, Target, Sparkles, MessageCircle } from 'lucide-react'
import { useToast } from '../../../hooks/use-toast'
import { MiniHandGestureControl } from '../../components/MiniHandGestureControl'
import { GoogleCalendarConnect } from '../../components/GoogleCalendarConnect'
import { Chatbot } from '../../components/Chatbot'
import { useRewrite } from '../../hooks/useRewrite'
import { addActivityToCalendar, isGoogleConnected } from '../../services/googleCalendarService'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type EmployeeRecommendation = {
  id: string
  activity_id: string
  activity_title: string
  activity_description: string
  start_date: string | null
  end_date: string | null
  score_total: number
  rank: number
  status: 'MANAGER_APPROVED' | 'NOTIFIED' | 'ACCEPTED' | 'DECLINED'
}

export default function EmployeeActivities() {
  const { fetchWithAuth } = useData()
  const { toast } = useToast()
  const location = useLocation()
  const { rewrite, rewriting } = useRewrite()
  const [declineModal, setDeclineModal] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [rewriteNotice, setRewriteNotice] = useState<string | null>(null)
  const [myRecs, setMyRecs] = useState<EmployeeRecommendation[]>([])
  const [activeGestureControl, setActiveGestureControl] = useState<string | null>(null)
  const [activeChatbot, setActiveChatbot] = useState<string | null>(null)

  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )

  const focusedActivityId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('activityId') ?? ''
  }, [location.search])

  const loadPending = async () => {
    if (!token) return
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my`)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de charger vos validations.', variant: 'destructive' })
      return
    }
    const raw = (await res.json()) as any[]
    const mapped: EmployeeRecommendation[] = raw
      .map((r: any) => ({
        id: String(r?._id ?? r?.id ?? ''),
        activity_id: String(r?.activityId?._id ?? r?.activityId ?? ''),
        activity_title: String(r?.activityId?.title ?? r?.activityId?.titre ?? 'Activite'),
        activity_description: String(r?.activityId?.description ?? ''),
        start_date: r?.activityId?.date ? String(r.activityId.date) : null,
        end_date: null,
        score_total: Number(r?.score_total ?? 0),
        rank: Number(r?.rank ?? 0),
        status: String(r?.status ?? '') as EmployeeRecommendation['status'],
      }))
      .filter((r) => r.status === 'NOTIFIED' || r.status === 'MANAGER_APPROVED')
    setMyRecs(mapped)
  }

  useEffect(() => {
    loadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusedActivityId || myRecs.length === 0) return
    const el = document.querySelector(`[data-activity-id="${focusedActivityId}"]`)
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusedActivityId, myRecs])

  const acceptActivity = async (rec: EmployeeRecommendation) => {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendationId: rec.id, response: 'ACCEPTED' }),
    })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Confirmation impossible.', variant: 'destructive' })
      return
    }
    
    // Ajouter à Google Calendar si connecté
    if (isGoogleConnected() && rec.start_date) {
      const calendarSuccess = await addActivityToCalendar({
        title: rec.activity_title,
        description: rec.activity_description,
        startDate: rec.start_date,
        endDate: rec.end_date || undefined,
        location: 'À définir',
      })
      
      if (calendarSuccess) {
        toast({ 
          title: 'Présence confirmée', 
          description: 'Activité ajoutée à votre calendrier Google ✓' 
        })
      } else {
        toast({ 
          title: 'Présence confirmée', 
          description: 'Votre confirmation a été envoyée (calendrier non synchronisé)' 
        })
      }
    } else {
      toast({ title: 'Présence confirmée', description: 'Votre confirmation a été envoyée.' })
    }
    
    setMyRecs((prev) => prev.filter((r) => r.id !== rec.id))
  }

  const declineActivity = (recId: string) => {
    void (async () => {
      const rec = myRecs.find((r) => r.id === recId)
      if (!rec) return
      if (!declineReason.trim()) {
        toast({ title: 'Motif requis', description: 'Veuillez indiquer la cause de l’absence.', variant: 'destructive' })
        return
      }
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: rec.id, response: 'DECLINED', justification: declineReason }),
      })
      if (!res.ok) {
        toast({ title: 'Erreur', description: 'Refus impossible.', variant: 'destructive' })
        return
      }
      setMyRecs((prev) => prev.filter((r) => r.id !== rec.id))
      setDeclineModal(null)
      setDeclineReason('')
      toast({ title: 'Refus envoyé', description: 'Votre motif d’absence a été transmis à RH.', variant: 'destructive' })
    })()
  }

  // Gestionnaire pour activer/désactiver le contrôle gestuel d'une activité
  const toggleGestureControl = (recId: string) => {
    if (activeGestureControl === recId) {
      setActiveGestureControl(null)
    } else {
      setActiveGestureControl(recId)
    }
  }

  // Gestionnaire pour ouvrir/fermer le chatbot d'une activité
  const toggleChatbot = (activityId: string) => {
    console.log('🤖 Toggle chatbot pour activité:', activityId);
    if (activeChatbot === activityId) {
      setActiveChatbot(null)
    } else {
      setActiveChatbot(activityId)
    }
  }

  // Handle AI rewrite
  const handleRewrite = async () => {
    if (!declineReason.trim()) return
    const result = await rewrite(declineReason)
    if (!result) {
      toast({ title: 'Reformulation impossible', description: 'Service indisponible, réessayez.', variant: 'destructive' })
      return
    }
    setDeclineReason(result.rewritten)
    setRewriteNotice('Texte reformulé avec succès.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Mes activités</h1>
        <p className="text-sm text-muted-foreground">{myRecs.length} activité(s) proposée(s)</p>
      </div>

      {/* Connexion Google Calendar */}
      <div className="reveal reveal-right animate-slide-up">
        <GoogleCalendarConnect />
      </div>

      <div className="reveal-grid flex flex-col gap-4">
        {myRecs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 card-animated">
            <p className="text-sm text-muted-foreground">Aucune activité proposée pour le moment</p>
          </div>
        ) : (
          myRecs.map((rec) => (
            <div
              key={rec.id}
              data-activity-id={rec.activity_id}
              className={`rounded-xl border bg-card p-5 card-animated ${
                focusedActivityId === rec.activity_id
                  ? 'border-primary ring-2 ring-primary/40 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{rec.activity_title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">{rec.activity_description}</p>
                </div>
                <StatusBadge status={rec.status.toLowerCase()} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {rec.start_date ? new Date(rec.start_date).toLocaleDateString() : 'N/A'}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> À définir</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5" /> Rang #{rec.rank}</div>
              </div>

              <div className="mt-3 flex items-center gap-4 rounded-lg bg-background p-3">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-primary">{(rec.score_total * 100).toFixed(1)}%</span>
                  <span className="text-[10px] text-muted-foreground">Score global</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground italic">Merci de confirmer votre présence ou indiquer la cause de l’absence.</p>
                </div>
              </div>

              {(rec.status === 'NOTIFIED' || rec.status === 'MANAGER_APPROVED') && (
                <div className="mt-4">
                  <MiniHandGestureControl
                    recommendationId={rec.id}
                    onAccept={() => acceptActivity(rec)}
                    onReject={() => {
                      void (async () => {
                        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/respond`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recommendationId: rec.id,
                            response: 'DECLINED',
                            justification: 'Refusé via contrôle gestuel',
                          }),
                        })
                        if (!res.ok) {
                          toast({ title: 'Erreur', description: 'Refus impossible.', variant: 'destructive' })
                          return
                        }
                        setMyRecs((prev) => prev.filter((r) => r.id !== rec.id))
                        setActiveGestureControl(null)
                        toast({ title: 'Refus envoyé', description: 'Votre refus a été transmis via geste.', variant: 'destructive' })
                      })()
                    }}
                    isActive={activeGestureControl === rec.id}
                    onToggle={() => toggleGestureControl(rec.id)}
                  />
                </div>
              )}

              {(rec.status === 'NOTIFIED' || rec.status === 'MANAGER_APPROVED') && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => toggleChatbot(rec.activity_id)}
                    className="button-micro flex items-center gap-1.5 rounded-lg border border-violet-500 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-600 dark:hover:bg-violet-900/40"
                    title="Poser des questions sur cette activité"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {activeChatbot === rec.activity_id ? 'Fermer le chatbot' : 'Chatbot'}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptActivity(rec)}
                      className="flex items-center justify-center rounded-lg bg-emerald-600 p-3 text-white hover:bg-emerald-700"
                      title="Accepter"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeclineModal(rec.id)}
                      className="flex items-center justify-center rounded-lg bg-red-600 p-3 text-white hover:bg-red-700"
                      title="Refuser"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Chatbot intégré */}
              {activeChatbot === rec.activity_id && (
                <div className="mt-4 animate-slide-up">
                  <Chatbot
                    activityId={rec.activity_id}
                    onClose={() => setActiveChatbot(null)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {declineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fade-in">
          <div className="reveal reveal-scale w-full max-w-md rounded-xl border border-border bg-card shadow-xl animate-slide-up">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-card-foreground">Justification du refus</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rédigez votre motif — l'IA peut le reformuler en message professionnel.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-6">
              <textarea
                value={declineReason}
                onChange={(e) => { setDeclineReason(e.target.value); setRewriteNotice(null) }}
                placeholder="Veuillez indiquer la raison du refus..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {rewriteNotice && (
                <p className="text-xs px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700">
                  ✓ {rewriteNotice}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void handleRewrite()}
                  disabled={rewriting || !declineReason.trim()}
                  title="Reformuler en message professionnel avec l'IA"
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-600 dark:hover:bg-violet-900/40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {rewriting ? 'Reformulation...' : 'Reformuler avec l’IA'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeclineModal(null); setDeclineReason(''); setRewriteNotice(null) }}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => declineActivity(declineModal)}
                    className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
                  >
                    Confirmer le refus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}