import { useMemo } from 'react'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import DataTable from '../../components/shared/DataTable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type ActivitySkillRow = {
  id: string
  intitule: string
  type: 'knowledge' | 'know_how' | 'soft_skills'
  auto_eval: number
  hierarchie_eval: number
  etat: string
  user_name: string
  usage_count: number // kept for UI compatibility: fixed to 1 per row
  avg_level: number // kept for charts (hierarchie_eval scaled 1-5)
}

export default function AdminSkills() {
  const { fetchWithAuth } = useData()
  const [skillRows, setSkillRows] = useState<ActivitySkillRow[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/users/competences/all`)
        if (!res.ok) {
          setSkillRows([])
          return
        }
        const payload = await res.json()
        const rows = Array.isArray(payload?.data) ? payload.data : []
        const mapped: ActivitySkillRow[] = rows.map((r: any) => ({
          id: String(r?.id ?? ''),
          intitule: String(r?.intitule ?? 'N/A'),
          type: String(r?.type ?? 'knowledge') as ActivitySkillRow['type'],
          auto_eval: Number(r?.auto_eval ?? 0),
          hierarchie_eval: Number(r?.hierarchie_eval ?? 0),
          etat: String(r?.etat ?? 'draft'),
          user_name: String(r?.user?.name ?? 'N/A'),
          usage_count: 1,
          avg_level: Math.max(1, Math.min(5, Number(r?.hierarchie_eval ?? 0) / 2)),
        }))
        setSkillRows(mapped)
      } catch {
        setSkillRows([])
      }
    }
    void load()
  }, [fetchWithAuth])

  const skillsByType = [
    { type: 'Savoir', count: skillRows.filter(c => c.type === 'knowledge').length, avg: Math.round(skillRows.filter(c => c.type === 'knowledge').reduce((s, c) => s + c.avg_level, 0) / Math.max(1, skillRows.filter(c => c.type === 'knowledge').length) * 2) },
    { type: 'Savoir-faire', count: skillRows.filter(c => c.type === 'know_how').length, avg: Math.round(skillRows.filter(c => c.type === 'know_how').reduce((s, c) => s + c.avg_level, 0) / Math.max(1, skillRows.filter(c => c.type === 'know_how').length) * 2) },
    { type: 'Savoir-etre', count: skillRows.filter(c => c.type === 'soft_skills').length, avg: Math.round(skillRows.filter(c => c.type === 'soft_skills').reduce((s, c) => s + c.avg_level, 0) / Math.max(1, skillRows.filter(c => c.type === 'soft_skills').length) * 2) },
  ]

  const columns = [
    { key: 'intitule', header: 'Competence', render: (c: ActivitySkillRow) => <span className="font-medium">{c.intitule}</span> },
    { key: 'type', header: 'Type', render: (c: ActivitySkillRow) => <StatusBadge status={c.type} /> },
    {
      key: 'employee', header: 'Employe', render: (c: ActivitySkillRow) => <span className="text-sm">{c.user_name}</span>
    },
    {
      key: 'auto_eval', header: 'Auto-eval', render: (c: ActivitySkillRow) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.auto_eval / 10) * 100}%` }} />
          </div>
          <span className="text-xs font-medium">{c.auto_eval}/10</span>
        </div>
      )
    },
    {
      key: 'hierarchie_eval', header: 'Eval. Hierarchie', render: (c: ActivitySkillRow) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-secondary" style={{ width: `${(c.hierarchie_eval / 10) * 100}%` }} />
          </div>
          <span className="text-xs font-medium">{c.hierarchie_eval}/10</span>
        </div>
      )
    },
    { key: 'etat', header: 'Statut', render: (c: ActivitySkillRow) => <StatusBadge status={c.etat} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Gestion des competences</h1>
        <p className="text-sm text-muted-foreground">{skillRows.length} competences basees sur les activites MongoDB</p>
      </div>

      {/* Stats cards */}
      <div className="reveal-grid grid grid-cols-1 gap-4 md:grid-cols-3">
        {skillsByType.map(s => (
          <div key={s.type} className="rounded-xl border border-border bg-card p-5 card-animated">
            <span className="text-sm font-medium text-muted-foreground">{s.type}</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-card-foreground">{s.count}</span>
              <span className="text-sm text-muted-foreground">evaluations</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(s.avg / 10) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Moy: {s.avg}/10</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card p-5 card-animated">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Scores moyens par type de competence</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={skillsByType} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
            <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            <Bar dataKey="avg" name="Score moyen" fill="hsl(27, 92%, 54%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="reveal reveal-scale">
        <DataTable columns={columns} data={skillRows} emptyMessage="Aucune competence" />
      </div>
    </div>
  )
}
