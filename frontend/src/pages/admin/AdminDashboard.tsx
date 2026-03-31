import { useEffect, useMemo, useState } from 'react'
import { Users, Building2, ClipboardList, Brain, TrendingUp, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useData } from '../../context/DataContext'
import StatCard from '../../components/shared/StatCard'

const COLORS = ['hsl(27, 92%, 54%)', 'hsl(222, 60%, 33%)', 'hsl(160, 60%, 45%)', 'hsl(43, 74%, 66%)', 'hsl(340, 75%, 55%)']
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type ApiCompetence = {
  type: 'knowledge' | 'know_how' | 'soft_skills' | string
  hierarchie_eval: number
  updated_at?: string | null
  user?: { department_id?: string }
}

export default function AdminDashboard() {
  const { users, departments, activities, fetchWithAuth } = useData()
  const [competences, setCompetences] = useState<ApiCompetence[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/users/competences/all`)
        if (!res.ok) {
          setCompetences([])
          return
        }
        const payload = await res.json()
        setCompetences(Array.isArray(payload?.data) ? payload.data : [])
      } catch {
        setCompetences([])
      }
    }
    void load()
  }, [fetchWithAuth])

  const departmentSkillStats = useMemo(() => {
    return departments.map((d) => {
      const byDept = competences.filter((c) => String(c?.user?.department_id ?? '') === d.id)
      const avg = (type: string) => {
        const rows = byDept.filter((c) => String(c.type) === type)
        if (rows.length === 0) return 0
        return Math.round((rows.reduce((s, c) => s + Number(c.hierarchie_eval ?? 0), 0) / rows.length) * 10)
      }
      return {
        department: d.name,
        knowledge: avg('knowledge'),
        know_how: avg('know_how'),
        soft_skills: avg('soft_skills'),
      }
    })
  }, [departments, competences])

  const progressionData = useMemo(() => {
    const now = new Date()
    const points: Array<{ month: string; score: number }> = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const monthRows = competences.filter((c) => {
        const src = c.updated_at ? new Date(c.updated_at) : null
        if (!src || Number.isNaN(src.getTime())) return false
        return `${src.getFullYear()}-${src.getMonth()}` === key
      })
      const monthScore = monthRows.length > 0
        ? Math.round((monthRows.reduce((s, c) => s + Number(c.hierarchie_eval ?? 0), 0) / monthRows.length) * 10)
        : 0
      points.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short' }),
        score: monthScore,
      })
    }
    return points
  }, [competences])

  const roleDistribution = [
    { name: 'Employes', value: users.filter(u => u.role === 'EMPLOYEE').length },
    { name: 'Managers', value: users.filter(u => u.role === 'MANAGER').length },
    { name: 'RH', value: users.filter(u => u.role === 'HR').length },
    { name: 'Admins', value: users.filter(u => u.role === 'ADMIN').length },
  ]

  const validDeptStats = departmentSkillStats.filter((d) => d.knowledge > 0 || d.know_how > 0 || d.soft_skills > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord Admin</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Stats */}
      <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Employes" value={users.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Departements" value={departments.length} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Activites" value={activities.length} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title="Competences evaluees" value={competences.length} icon={<Brain className="h-5 w-5" />} />
      </div>

      {/* Charts row */}
      <div className="reveal-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Skills by department */}
        <div className="col-span-2 rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Competences par departement</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={validDeptStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(' ')[0]} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
              <Bar dataKey="knowledge" name="Savoir" fill="hsl(27, 92%, 54%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="know_how" name="Savoir-faire" fill="hsl(222, 60%, 33%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="soft_skills" name="Savoir-etre" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role distribution */}
        <div className="rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Repartition des roles</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {roleDistribution.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progression line chart */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card p-5 card-animated">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Progression globale des competences</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={progressionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            <Line type="monotone" dataKey="score" stroke="hsl(27, 92%, 54%)" strokeWidth={2} dot={{ fill: 'hsl(27, 92%, 54%)', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
