import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import { useToast } from '../../../hooks/use-toast'
import { ClipboardPlus } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
    requiredSkills: '',
    maxParticipants: 10,
    startDate: '',
    endDate: '',
    location: '',
    duration: '',
  })

  const loadRequests = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests/my`)
    if (!res.ok) return
    setRequests(await res.json())
  }

  useEffect(() => {
    void loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.startDate || !form.endDate) {
      toast({ title: 'Champs requis', description: 'Titre, description et dates sont obligatoires.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const requiredSkills = form.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ skill_name: s, desired_level: 'medium' }))

      const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          objectifs: form.objectifs,
          type: form.type,
          requiredSkills,
          maxParticipants: form.maxParticipants,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          location: form.location,
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
        requiredSkills: '',
        maxParticipants: 10,
        startDate: '',
        endDate: '',
        location: '',
        duration: '',
      })
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
          <input className="input-micro rounded-lg border px-3 py-2 md:col-span-2" placeholder="Compétences (ex: React,Leadership,Node)" value={form.requiredSkills} onChange={(e) => setForm((p) => ({ ...p, requiredSkills: e.target.value }))} />
          <input type="number" className="input-micro rounded-lg border px-3 py-2" placeholder="Places" value={form.maxParticipants} onChange={(e) => setForm((p) => ({ ...p, maxParticipants: Number(e.target.value) }))} />
          <input className="input-micro rounded-lg border px-3 py-2" placeholder="Durée (ex: 3 jours)" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
          <input type="datetime-local" className="input-micro rounded-lg border px-3 py-2" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <input type="datetime-local" className="input-micro rounded-lg border px-3 py-2" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          <input className="input-micro rounded-lg border px-3 py-2 md:col-span-2" placeholder="Lieu" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
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

