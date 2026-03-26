import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'
import { useData } from '../../context/DataContext'
import StatCard from '../../components/shared/StatCard'
import { TrendingUp, Target, Users, Brain } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
type ApiCompetence = {
  intitule: string
  type: string
  auto_eval: number
  hierarchie_eval: number
  user?: { department_id?: string }
}
type ApiRecommendationRow = { status?: string; score_total?: number }

export default function AdminAnalytics() {
  const { users, activities, fetchWithAuth } = useData()
  const [competences, setCompetences] = useState<ApiCompetence[]>([])
  const [recRows, setRecRows] = useState<ApiRecommendationRow[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [compRes, recRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/users/competences/all`),
          fetchWithAuth(`${API_BASE_URL}/api/recommendations/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }),
        ])
        if (compRes.ok) {
          const c = await compRes.json()
          setCompetences(Array.isArray(c?.data) ? c.data : [])
        } else {
          setCompetences([])
        }
        if (recRes.ok) {
          const r = await recRes.json()
          setRecRows(Array.isArray(r) ? r : [])
        } else {
          setRecRows([])
        }
      } catch {
        setCompetences([])
        setRecRows([])
      }
    }
    void load()
  }, [fetchWithAuth])

  const departmentSkillStats = useMemo(() => {
    const depName = new Map(users.map((u) => [u.departement_id, u.departement_id || 'N/A']))
    const buckets = new Map<string, { knowledge: number[]; know_how: number[]; soft_skills: number[] }>()
    for (const c of competences) {
      const key = String(c?.user?.department_id ?? 'N/A')
      const curr = buckets.get(key) ?? { knowledge: [], know_how: [], soft_skills: [] }
      const score = Math.max(0, Math.min(100, Number(c.hierarchie_eval ?? 0) * 10))
      if (c.type === 'knowledge') curr.knowledge.push(score)
      else if (c.type === 'know_how') curr.know_how.push(score)
      else curr.soft_skills.push(score)
      buckets.set(key, curr)
    }
    return Array.from(buckets.entries()).map(([department, v]) => ({
      department: depName.get(department) ?? department,
      knowledge: v.knowledge.length ? Math.round(v.knowledge.reduce((a, b) => a + b, 0) / v.knowledge.length) : 0,
      know_how: v.know_how.length ? Math.round(v.know_how.reduce((a, b) => a + b, 0) / v.know_how.length) : 0,
      soft_skills: v.soft_skills.length ? Math.round(v.soft_skills.reduce((a, b) => a + b, 0) / v.soft_skills.length) : 0,
    }))
  }, [users, competences])

  const skillGaps = useMemo(() => {
    const bySkill = new Map<string, number[]>()
    for (const c of competences) {
      const n = String(c.intitule ?? '').trim()
      if (!n) continue
      const arr = bySkill.get(n) ?? []
      arr.push(Number(c.hierarchie_eval ?? 0) * 10)
      bySkill.set(n, arr)
    }
    return Array.from(bySkill.entries())
      .map(([skill, scores]) => {
        const current = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        const required = 80
        return { skill, current, required, gap: required - current }
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 9)
  }, [competences])

  const avgScore = recRows.length > 0
    ? Math.round((recRows.reduce((s, r) => s + Number(r.score_total ?? 0), 0) / recRows.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Analytiques</h1>
        <p className="text-sm text-muted-foreground">Vue analytique complete du systeme de recommandation</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={<TrendingUp className="h-5 w-5" />} trend={{ value: 4, label: 'vs dernier trimestre' }} />
        <StatCard title="Ecarts identifies" value={skillGaps.length} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Employes evalues" value={users.filter(u => u.role === 'EMPLOYEE').length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Activites actives" value={activities.filter(a => a.status !== 'cancelled' && a.status !== 'draft').length} icon={<Brain className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skill gaps */}
        <div className="rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Ecarts de competences (Gap Analysis)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={skillGaps} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="skill" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
              <Bar dataKey="current" name="Niveau actuel" fill="hsl(27, 92%, 54%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="required" name="Niveau requis" fill="hsl(222, 60%, 33%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Profil competences par departement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={departmentSkillStats}>
              <PolarGrid stroke="hsl(220, 13%, 89%)" />
              <PolarAngleAxis dataKey="department" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(' ')[0]} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Savoir" dataKey="knowledge" stroke="hsl(27, 92%, 54%)" fill="hsl(27, 92%, 54%)" fillOpacity={0.2} />
              <Radar name="Savoir-faire" dataKey="know_how" stroke="hsl(222, 60%, 33%)" fill="hsl(222, 60%, 33%)" fillOpacity={0.2} />
              <Radar name="Savoir-etre" dataKey="soft_skills" stroke="hsl(160, 60%, 45%)" fill="hsl(160, 60%, 45%)" fillOpacity={0.2} />
              <Legend />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gap detail cards */}
      <div className="rounded-xl border border-border bg-card p-5 card-animated">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Detail des ecarts prioritaires</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skillGaps.sort((a, b) => b.gap - a.gap).map(g => (
            <div key={g.skill} className="rounded-lg border border-border bg-background p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-card-foreground">{g.skill}</span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">-{g.gap}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Actuel</span>
                  <span>{g.current}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${g.current}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Requis</span>
                  <span>{g.required}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-secondary" style={{ width: `${g.required}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
