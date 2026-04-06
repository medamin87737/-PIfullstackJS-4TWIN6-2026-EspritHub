import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'
import { useToast } from '../../../hooks/use-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type RequestItem = {
  _id: string
  title: string
  description: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  hr_note?: string
  manager_id?: { name?: string; email?: string; matricule?: string }
  department_id?: { name?: string; code?: string }
}

export default function HRActivityRequests() {
  const { fetchWithAuth } = useData()
  const { toast } = useToast()
  const [items, setItems] = useState<RequestItem[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests`)
    if (!res.ok) return
    setItems(await res.json())
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const review = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setLoadingId(id)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/manager/activity-requests/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, hr_note: notes[id] }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Action impossible')
      }
      toast({
        title: status === 'APPROVED' ? 'Demande approuvée' : 'Demande rejetée',
        description: status === 'APPROVED' ? 'Activité créée depuis la demande.' : 'Le manager a été notifié du rejet.',
      })
      await load()
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message ?? 'Erreur traitement demande', variant: 'destructive' })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left">
        <h1 className="text-2xl font-bold text-foreground">Demandes activités managers</h1>
        <p className="text-sm text-muted-foreground">Validez les demandes managers pour créer des activités automatiquement.</p>
      </div>

      <div className="reveal reveal-right rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Aucune demande trouvée.</p>
          ) : (
            items.map((r) => (
              <div key={r._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Manager: {r.manager_id?.name ?? 'N/A'} · Dept: {r.department_id?.name ?? 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                    <p className="mt-1 text-xs font-semibold">Statut: {r.status}</p>
                    {r.hr_note && <p className="mt-1 text-xs text-destructive">Note RH: {r.hr_note}</p>}
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex min-w-[280px] flex-col gap-2">
                      <textarea
                        rows={2}
                        className="input-micro rounded-lg border px-3 py-2 text-xs"
                        placeholder="Note RH (optionnel)"
                        value={notes[r._id] ?? ''}
                        onChange={(e) => setNotes((p) => ({ ...p, [r._id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => review(r._id, 'APPROVED')}
                          disabled={loadingId === r._id}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Accepter et créer activité
                        </button>
                        <button
                          onClick={() => review(r._id, 'REJECTED')}
                          disabled={loadingId === r._id}
                          className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
