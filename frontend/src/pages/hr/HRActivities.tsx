import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import DataTable from '../../components/shared/DataTable'
import { Plus, Search, Sparkles, Pencil, Trash2, X, Check, Bot, Presentation, ArrowUpDown } from 'lucide-react'
import type { Activity } from '../../types'
import { useToast } from '../../../hooks/use-toast'

export default function HRActivities() {
  const { activities, updateActivity, deleteActivity } = useData()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortDesc, setSortDesc] = useState(true)

  // Edit state
  const [editing, setEditing] = useState<Activity | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<Activity['type']>('training')
  const [editSeats, setEditSeats] = useState<number>(0)
  const [editDate, setEditDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editPriority, setEditPriority] = useState<Activity['priority']>('consolidate_medium')
  const [editStatusValue, setEditStatusValue] = useState<Activity['status']>('draft')
  const [editLocation, setEditLocation] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openEdit = (a: Activity) => {
    setDeleteId(null)
    setEditing(a)
    setEditTitle(a.title)
    setEditDescription(a.description)
    setEditType(a.type)
    setEditSeats(a.seats)
    // Convert ISO date to datetime-local string (YYYY-MM-DDTHH:MM)
    try {
      const d = new Date(a.date)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      setEditDate(local.toISOString().slice(0, 16))
    } catch {
      setEditDate('')
    }
    if (a.end_date) {
      try {
        const dEnd = new Date(a.end_date)
        const localEnd = new Date(dEnd.getTime() - dEnd.getTimezoneOffset() * 60000)
        setEditEndDate(localEnd.toISOString().slice(0, 16))
      } catch {
        setEditEndDate('')
      }
    } else {
      setEditEndDate('')
    }
    setEditPriority(a.priority)
    setEditStatusValue(a.status)
    setEditLocation(a.location)
    setEditDuration(a.duration)
  }

  const openDelete = (id: string) => {
    setEditing(null)
    setDeleteId(id)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setEditLoading(true)
    try {
      const payload: any = {
        title: editTitle,
        description: editDescription,
        type: editType,
        maxParticipants: editSeats,
        priority: editPriority,
        status: editStatusValue,
        location: editLocation,
        duration: editDuration,
      }

      if (editDate) {
        payload.startDate = new Date(editDate).toISOString()
      }
      if (editEndDate) {
        payload.endDate = new Date(editEndDate).toISOString()
      }

      const res = await fetch(`http://localhost:3000/activities/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de la modification')
      }
      updateActivity({
        ...editing,
        title: editTitle,
        description: editDescription,
        type: editType,
        seats: editSeats,
        date: editDate ? new Date(editDate).toISOString() : editing.date,
        end_date: editEndDate ? new Date(editEndDate).toISOString() : editing.end_date,
        priority: editPriority,
        status: editStatusValue,
        location: editLocation,
        duration: editDuration,
      })
      toast({ title: 'Activité mise à jour', description: 'Les informations ont été enregistrées.' })
      setEditing(null)
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de modifier cette activité.' })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`http://localhost:3000/activities/${deleteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de la suppression')
      }
      deleteActivity(deleteId)
      toast({ title: 'Activité supprimée', description: "L'activité a été supprimée avec succès." })
      setDeleteId(null)
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de supprimer cette activité.' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const list = activities.filter(a => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchStatus
    })
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortDesc ? db - da : da - db
    })
  }, [activities, search, statusFilter, sortDesc])

  const columns = [
    {
      key: 'title', header: 'Titre', render: (a: Activity) => (
        <div className="flex flex-col">
          <span className="font-medium text-card-foreground">{a.title}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{a.description}</span>
        </div>
      )
    },
    { key: 'type', header: 'Type', render: (a: Activity) => <StatusBadge status={a.type} /> },
    { key: 'seats', header: 'Places', render: (a: Activity) => <span className="font-medium">{a.seats}</span> },
    { key: 'date', header: 'Date', render: (a: Activity) => <span className="text-sm">{new Date(a.date).toLocaleDateString('fr-FR')}</span> },
    { key: 'priority', header: 'Priorité', render: (a: Activity) => <StatusBadge status={a.priority} /> },
    { key: 'status', header: 'Statut', render: (a: Activity) => <StatusBadge status={a.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      isAction: true,
      render: (a: Activity) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/hr/recommendations/${a.id}`}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Reco
          </Link>
          <Link
            to={`/hr/recommendations/${a.id}`}
            className="flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            title="Ouvrir et confirmer l'activité côté RH"
          >
            <Check className="h-3.5 w-3.5" /> Confirmer activité
          </Link>
          <a
            href={`http://localhost:3000/activities/${a.id}/export-pptx`}
            download
            title="Télécharger la présentation PPTX"
            className="button-micro flex items-center gap-1 rounded-lg border border-violet-500 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-400"
          >
            <Presentation className="h-3.5 w-3.5" /> PPTX
          </a>
          <button
            type="button"
            onClick={() => openEdit(a)}
            className="button-micro flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent"
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openDelete(a.id)}
            className="button-micro flex h-7 w-7 items-center justify-center rounded-md border border-destructive/40 bg-background text-destructive hover:bg-destructive/10"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activités</h1>
          <p className="text-sm text-muted-foreground">{activities.length} activités au total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/hr/create-activity-chat" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Bot className="h-4 w-4" /> Assistant IA
          </Link>
          <Link to="/hr/create-activity" className="button-micro gradient-surface flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Créer
          </Link>
        </div>
      </div>

      <div className="reveal reveal-right flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Tous statuts</option>
          <option value="draft">Brouillon</option>
          <option value="open">Ouvert</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
        <button
          onClick={() => setSortDesc((p) => !p)}
          className="flex items-center gap-1.5 h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortDesc ? 'Plus récentes' : 'Plus anciennes'}
        </button>
      </div>

      {/* Panel confirmation suppression */}
      {deleteId && (
        <div className="reveal reveal-scale rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4 flex items-center justify-between gap-4 animate-fade-in">
          <p className="text-sm font-medium text-destructive">
            Confirmer la suppression de cette activité ? Cette action est irréversible.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              disabled={deleteLoading}
              className="button-micro flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="button-micro flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteLoading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      )}

      {/* Panel édition inline */}
      {editing && (
        <div className="reveal reveal-scale rounded-xl border border-border bg-card p-5 card-animated">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Modifier l'activité</h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium">Titre</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as Activity['type'])}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="training">Formation</option>
                <option value="certification">Certification</option>
                <option value="project">Projet</option>
                <option value="mission">Mission</option>
                <option value="audit">Audit</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nombre de places</label>
              <input
                type="number"
                min={1}
                value={editSeats}
                onChange={(e) => setEditSeats(Number(e.target.value) || 0)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Date de début</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Date de fin</label>
              <input
                type="datetime-local"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Priorité</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Activity['priority'])}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="develop_low">Développer (faible)</option>
                <option value="consolidate_medium">Consolider (moyen)</option>
                <option value="exploit_expert">Exploiter (expert)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={editStatusValue}
                onChange={(e) => setEditStatusValue(e.target.value as Activity['status'])}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="draft">Brouillon</option>
                <option value="open">Ouvert</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Lieu</label>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Salle de formation, En ligne..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Durée</label>
              <input
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: 2 jours, 3h, 1 semaine..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={editLoading}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                {editLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="reveal reveal-right">
        <DataTable columns={columns} data={filtered} emptyMessage="Aucune activité trouvée" />
      </div>
    </div>
  )
}