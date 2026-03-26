import { useState } from 'react'
import { useData } from '../../context/DataContext'
import DataTable from '../../components/shared/DataTable'
import StatusBadge from '../../components/shared/StatusBadge'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import type { User, UserRole, UserStatus } from '../../types'

export default function AdminUsers() {
  const { users, departments, addUser, updateUser, deleteUser, getDepartmentName } = useData()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.matricule.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const openCreate = () => { setEditingUser(null); setShowModal(true) }
  const openEdit = (user: User) => { setEditingUser(user); setShowModal(true) }

  const columns = [
    { key: 'matricule', header: 'Matricule', render: (u: User) => <span className="font-mono text-xs">{u.matricule}</span> },
    {
      key: 'name', header: 'Nom', render: (u: User) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{u.name}</span>
            <span className="text-xs text-muted-foreground">{u.email}</span>
          </div>
        </div>
      )
    },
    { key: 'department', header: 'Departement', render: (u: User) => <span className="text-sm">{getDepartmentName(u.departement_id)}</span> },
    { key: 'role', header: 'Role', render: (u: User) => <StatusBadge status={u.role.toLowerCase()} /> },
    { key: 'status', header: 'Statut', render: (u: User) => <StatusBadge status={u.status} /> },
    { key: 'en_ligne', header: 'En ligne', render: (u: User) => (
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${u.en_ligne ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        <span className="text-xs text-muted-foreground">{u.en_ligne ? 'Oui' : 'Non'}</span>
      </div>
    )},
    { key: 'actions', header: 'Actions', render: (u: User) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(u) }} className="button-micro rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><Edit2 className="h-4 w-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); deleteUser(u.id) }} className="button-micro rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
    )},
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateurs au total</p>
        </div>
        <button onClick={openCreate} className="button-micro gradient-surface flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      {/* Filters */}
      <div className="reveal reveal-right flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-micro h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Tous les roles</option>
          <option value="ADMIN">Admin</option>
          <option value="HR">RH</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employe</option>
        </select>
      </div>

      <div className="reveal reveal-scale">
        <DataTable columns={columns} data={filtered} emptyMessage="Aucun utilisateur trouve" />
      </div>

      {/* Modal */}
      {showModal && <UserModal user={editingUser} departments={departments} onClose={() => setShowModal(false)} onSave={(u) => { editingUser ? updateUser(u) : addUser(u); setShowModal(false) }} />}
    </div>
  )
}

function UserModal({ user, departments, onClose, onSave }: { user: User | null; departments: { id: string; name: string }[]; onClose: () => void; onSave: (u: User) => void }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    matricule: user?.matricule ?? '',
    telephone: user?.telephone ?? '',
    role: user?.role ?? 'EMPLOYEE' as UserRole,
    status: user?.status ?? 'active' as UserStatus,
    departement_id: user?.departement_id ?? '1',
    date_embauche: user?.date_embauche ?? new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      id: user?.id ?? String(Date.now()),
      password: 'hashed',
      manager_id: user?.manager_id ?? null,
      en_ligne: user?.en_ligne ?? false,
    })
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">{user ? 'Modifier' : 'Nouvel'} utilisateur</h2>
          <button onClick={onClose} className="button-micro rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom complet" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Matricule" value={form.matricule} onChange={(v) => setForm({ ...form, matricule: v })} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Telephone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="ADMIN">Admin</option>
                <option value="HR">RH</option>
                <option value="MANAGER">Manager</option>
                <option value="EMPLOYEE">Employe</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Departement</label>
              <select value={form.departement_id} onChange={(e) => setForm({ ...form, departement_id: e.target.value })}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Field label="Date d'embauche" type="date" value={form.date_embauche} onChange={(v) => setForm({ ...form, date_embauche: v })} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-card-foreground">Statut</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent">Annuler</button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-card-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}
