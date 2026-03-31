import { useEffect, useState, lazy, Suspense } from 'react'
import { useData } from '../../context/DataContext'
import { useToast } from '../../../hooks/use-toast'
import { ClipboardPlus, Plus, Trash2, MapPin } from 'lucide-react'
import type { RequiredSkill } from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const LocationPicker = lazy(() => import('../../components/LocationPicker'))

type ActivityRequest = {
  _id: string
  title: string
  description: string
  type: string
  maxParticipants: number
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  hr_note?: string
}
type SkillOption = { intitule: string; type?: string }

export default function ManagerActivityRequests() {
  const { fetchWithAuth } = useData()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<ActivityRequest[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    objectifs: '',
    type: 'training',
    maxParticipants: 10,
    startDate: '',
    endDate: '',
    location: {
      lat: 36.8065,
      lng: 10.1815,
      address: 'Tunis, Tunisie'
    },
    duration: '',
  })
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([{ skill_name: '', desired_level: 'medium' }])
  const [allSkills, setAllSkills] = useState<SkillOption[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDetails, setNewSkillDetails] = useState('')
  const [newSkillType, setNewSkillType] = useState<'knowledge' | 'know_how' | 'soft_skills'>('knowledge')

  const addSkillRow = () => setRequiredSkills((prev) => [...prev, { skill_name: '', desired_level: 'medium' }])
  const removeSkillRow = (idx: number) => setRequiredSkills((prev) => prev.filter((_, i) => i !== idx))
  const updateSkillRow = (idx: number, updates: Partial<RequiredSkill>) =>
    setRequiredSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)))

  const loadAllSkills = async () => {
    setSkillsLoading(true)
    try {
      const [resCompetences, resQuestions] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE_URL}/users/competences/all`),
        fetchWithAuth(`${API_BASE_URL}/users/question-competences/all`),
      ])

      const competencesResponse =
        resCompetences.status === 'fulfilled' && resCompetences.value.ok ? resCompetences.value : null
      const questionsResponse =
        resQuestions.status === 'fulfilled' && resQuestions.value.ok ? resQuestions.value : null

      if (!competencesResponse && !questionsResponse) {
        throw new Error('Chargement des compétences impossible')
      }

      const payloadCompetences = competencesResponse ? await competencesResponse.json() : []
      const payloadQuestions = questionsResponse ? await questionsResponse.json() : []
      const rowsCompetences = Array.isArray(payloadCompetences?.data) ? payloadCompetences.data : (Array.isArray(payloadCompetences) ? payloadCompetences : [])
      const rowsQuestions = Array.isArray(payloadQuestions?.data) ? payloadQuestions.data : (Array.isArray(payloadQuestions) ? payloadQuestions : [])

      const merged = [
        ...rowsCompetences.map((r: any) => ({ intitule: String(r?.intitule ?? r?.name ?? '').trim(), type: r?.type ? String(r.type) : undefined })),
        ...rowsQuestions.map((r: any) => ({ intitule: String(r?.intitule ?? '').trim(), type: r?.type ? String(r.type) : undefined })),
      ].filter((s) => s.intitule.length > 0)
      const unique = Array.from(new Map(merged.map((s) => [s.intitule.toLowerCase(), s])).values()).sort((a, b) => a.intitule.localeCompare(b.intitule))
      setAllSkills(unique)
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Chargement des compétences impossible', variant: 'destructive' })
    } finally {
      setSkillsLoading(false)
    }
  }

  const createSkillInDb = async () => {
    const name = newSkillName.trim()
    if (!name) {
      toast({ title: 'Nom requis', description: 'Saisissez le nom de la compétence.', variant: 'destructive' })
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
        const msg = await res.text()
        throw new Error(msg || 'Création de compétence impossible')
      }
      setNewSkillName('')
      setNewSkillDetails('')
      await loadAllSkills()
      toast({ title: 'Compétence créée', description: `${name} ajoutée à la base.`, variant: 'success' })
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Création de compétence impossible', variant: 'destructive' })
    }
  }

  const loadRequests = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests/my`)
    if (!res.ok) return
    setRequests(await res.json())
  }

  useEffect(() => {
    void loadRequests()
    void loadAllSkills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.startDate || !form.endDate) {
      toast({ title: 'Champs requis', description: 'Titre, description et dates sont obligatoires.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const normalizedSkills = requiredSkills
        .filter((s) => String(s.skill_name ?? '').trim())
        .map((s) => ({ skill_name: String(s.skill_name).trim(), desired_level: s.desired_level ?? 'medium' }))

      const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          objectifs: form.objectifs,
          type: form.type,
          requiredSkills: normalizedSkills,
          maxParticipants: form.maxParticipants,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          // Manager API expects a string location.
          location: form.location.address,
          duration: form.duration,
        }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erreur envoi demande')
      }
      toast({ title: 'Demande envoyée', description: 'Votre demande a été transmise à RH.' })
      setForm({
        title: '',
        description: '',
        objectifs: '',
        type: 'training',
        maxParticipants: 10,
        startDate: '',
        endDate: '',
        location: {
          lat: 36.8065,
          lng: 10.1815,
          address: 'Tunis, Tunisie'
        },
        duration: '',
      })
      setRequiredSkills([{ skill_name: '', desired_level: 'medium' }])
      await loadRequests()
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message ?? 'Envoi impossible', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left">
        <h1 className="text-2xl font-bold text-foreground">Demander une activité</h1>
        <p className="text-sm text-muted-foreground">Soumettez une demande que RH pourra approuver et convertir en activité.</p>
      </div>

      <div className="reveal reveal-right rounded-xl border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="input-micro rounded-lg border px-3 py-2" placeholder="Titre" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select className="input-micro rounded-lg border px-3 py-2" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="training">Training</option>
            <option value="certification">Certification</option>
            <option value="project">Project</option>
            <option value="mission">Mission</option>
            <option value="audit">Audit</option>
          </select>
          <textarea className="input-micro rounded-lg border px-3 py-2 md:col-span-2" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <textarea className="input-micro rounded-lg border px-3 py-2 md:col-span-2" rows={2} placeholder="Objectifs" value={form.objectifs} onChange={(e) => setForm((p) => ({ ...p, objectifs: e.target.value }))} />
          <div className="rounded-lg border border-border bg-background p-3 md:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Compétences demandées</p>
              <button type="button" onClick={addSkillRow} className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Plus className="h-3.5 w-3.5" /> Ajouter compétence
              </button>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <input
                className="input-micro rounded-lg border px-3 py-2"
                placeholder="Rechercher une compétence"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
              <button type="button" onClick={() => void loadAllSkills()} className="rounded-lg border px-3 py-2 text-sm">
                {skillsLoading ? 'Chargement...' : 'Actualiser liste'}
              </button>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_170px]">
              <input
                className="input-micro rounded-lg border px-3 py-2"
                placeholder="Nouvelle compétence"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
              <input
                className="input-micro rounded-lg border px-3 py-2"
                placeholder="Détails (optionnel)"
                value={newSkillDetails}
                onChange={(e) => setNewSkillDetails(e.target.value)}
              />
              <select
                className="input-micro rounded-lg border px-3 py-2"
                value={newSkillType}
                onChange={(e) => setNewSkillType((e.target.value as 'knowledge' | 'know_how' | 'soft_skills') ?? 'knowledge')}
              >
                <option value="knowledge">knowledge</option>
                <option value="know_how">know_how</option>
                <option value="soft_skills">soft_skills</option>
              </select>
              <button type="button" onClick={() => void createSkillInDb()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground whitespace-nowrap min-w-[170px]">
                Ajouter à la base
              </button>
            </div>
            <div className="space-y-2">
              {requiredSkills.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_auto]">
                  <select
                    className="input-micro rounded-lg border px-3 py-2"
                    value={row.skill_name}
                    onChange={(e) => updateSkillRow(idx, { skill_name: e.target.value })}
                  >
                    <option value="">-- Sélectionner une compétence --</option>
                    {allSkills
                      .filter((s) => s.intitule.toLowerCase().includes(skillSearch.trim().toLowerCase()))
                      .map((s, skillIdx) => (
                        <option key={`${s.intitule}-${skillIdx}`} value={s.intitule}>
                          {s.intitule}{s.type ? ` (${s.type})` : ''}
                        </option>
                      ))}
                  </select>
                  <select
                    className="input-micro rounded-lg border px-3 py-2"
                    value={row.desired_level}
                    onChange={(e) => updateSkillRow(idx, { desired_level: e.target.value as any })}
                  >
                    <option value="low">Bas</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                    <option value="expert">Expert</option>
                  </select>
                  {requiredSkills.length > 1 ? (
                    <button type="button" onClick={() => removeSkillRow(idx)} className="inline-flex items-center justify-center rounded-lg border px-2 py-2 text-muted-foreground hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>
          </div>
          <input type="number" className="input-micro rounded-lg border px-3 py-2" placeholder="Places" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))} />
          <input className="input-micro rounded-lg border px-3 py-2" placeholder="Durée (ex: 3 jours)" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
          <input type="datetime-local" className="input-micro rounded-lg border px-3 py-2" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <input type="datetime-local" className="input-micro rounded-lg border px-3 py-2" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          <div className="md:col-span-2 rounded-lg border border-border bg-background p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <p className="text-sm font-semibold">Localisation</p>
            </div>
            <input
              className="input-micro rounded-lg border px-3 py-2 w-full"
              placeholder="Adresse"
              value={form.location.address}
              onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, address: e.target.value } }))}
            />
            <Suspense fallback={
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-gray-500">Chargement de la carte...</div>
              </div>
            }>
              <LocationPicker
                onLocationSelect={(lat: number, lng: number, address: string) => {
                  setForm((p) => ({ ...p, location: { lat, lng, address } }))
                }}
                initialLocation={{ lat: form.location.lat, lng: form.location.lng }}
              />
            </Suspense>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <ClipboardPlus className="h-4 w-4" />
          {loading ? 'Envoi...' : 'Envoyer la demande à RH'}
        </button>
      </div>

      <div className="reveal reveal-scale rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-card-foreground">Mes demandes</h2>
        </div>
        <div className="divide-y divide-border">
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Aucune demande pour le moment.</p>
          ) : (
            requests.map((r) => (
              <div key={r._id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.title}</p>
                  <span className="text-xs font-semibold">{r.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                {r.hr_note && <p className="mt-1 text-xs text-destructive">Note RH: {r.hr_note}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

