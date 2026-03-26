import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { Plus, Edit2, Trash2, X, Building2, Users } from 'lucide-react'
import type { Department } from '../../types'

export default function AdminDepartments() {
  const { departments, users, addDepartment, updateDepartment, deleteDepartment } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des departements</h1>
          <p className="text-sm text-muted-foreground">{departments.length} departements</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="button-micro gradient-surface flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouveau
        </button>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map(dept => {
          const memberCount = users.filter(u => u.departement_id === dept.id).length
          const manager = users.find(u => u.id === dept.manager_id)
          return (
            <div key={dept.id} className="rounded-xl border border-border bg-card p-5 card-animated">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">{dept.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground">{dept.code}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(dept); setShowModal(true) }} className="button-micro rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => deleteDepartment(dept.id)} className="button-micro rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{dept.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {memberCount} membre{memberCount !== 1 ? 's' : ''}
                </div>
                {manager && <span className="text-xs text-muted-foreground">Manager: {manager.name}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <DeptModal
          dept={editing}
          onClose={() => setShowModal(false)}
          onSave={(d) => { editing ? updateDepartment(d) : addDepartment(d); setShowModal(false) }}
        />
      )}
    </div>
  )
}

function DeptModal({ dept, onClose, onSave }: { dept: Department | null; onClose: () => void; onSave: (d: Department) => void }) {
  const [form, setForm] = useState({ name: dept?.name ?? '', code: dept?.code ?? '', description: dept?.description ?? '' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">{dept ? 'Modifier' : 'Nouveau'} departement</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, id: dept?.id ?? String(Date.now()), manager_id: dept?.manager_id ?? '1', created_at: dept?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }) }} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-card-foreground">Nom</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-card-foreground">Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-card-foreground">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent">Annuler</button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}
