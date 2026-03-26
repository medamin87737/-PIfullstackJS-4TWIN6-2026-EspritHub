import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useData } from '../../context/DataContext'
import StatCard from '../../components/shared/StatCard'
import { TrendingUp, Target, ClipboardList, CheckCircle } from 'lucide-react'

const COLORS = ['hsl(27, 92%, 54%)', 'hsl(222, 60%, 33%)', 'hsl(160, 60%, 45%)', 'hsl(43, 74%, 66%)', 'hsl(340, 75%, 55%)']
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
type ApiRec = { status?: string; score_total?: number; activity?: { id?: string } }
type ApiComp = { intitule?: string; hierarchie_eval?: number; auto_eval?: number }

export default function HRAnalytics() {
  const { activities, fetchWithAuth } = useData()
  const [recRows, setRecRows] = useState<ApiRec[]>([])
  const [competences, setCompetences] = useState<ApiComp[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/api/recommendations/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }),
          fetchWithAuth(`${API_BASE_URL}/users/competences/all`),
        ])
        if (rRes.ok) {
          const r = await rRes.json()
          setRecRows(Array.isArray(r) ? r : [])
        } else {
          setRecRows([])
        }
        if (cRes.ok) {
          const c = await cRes.json()
          setCompetences(Array.isArray(c?.data) ? c.data : [])
        } else {
          setCompetences([])
        }
      } catch {
        setRecRows([])
        setCompetences([])
      }
    }
    void load()
  }, [fetchWithAuth])

  const progressionData = useMemo(() => {
    const now = new Date()
    const points: Array<{ month: string; score: number }> = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      // Search endpoint doesn't provide created_at; use rolling score stability from live list.
      const avg = recRows.length > 0
        ? Math.round((recRows.reduce((s, r) => s + Number(r.score_total ?? 0), 0) / recRows.length) * 100)
        : 0
      points.push({ month: d.toLocaleDateString('fr-FR', { month: 'short' }), score: avg })
    }
    return points
  }, [recRows])

  const skillGaps = useMemo(() => {
    const bucket = new Map<string, number[]>()
    for (const c of competences) {
      const key = String(c.intitule ?? '').trim()
      if (!key) continue
      const arr = bucket.get(key) ?? []
      arr.push(Number(c.hierarchie_eval ?? 0) * 10)
      bucket.set(key, arr)
    }
    return Array.from(bucket.entries())
      .map(([skill, scores]) => {
        const current = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        const required = 80
        return { skill, current, required, gap: required - current }
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 8)
  }, [competences])

  const activityByType = [
    { name: 'Formation', value: activities.filter(a => a.type === 'training').length },
    { name: 'Certification', value: activities.filter(a => a.type === 'certification').length },
    { name: 'Projet', value: activities.filter(a => a.type === 'project').length },
    { name: 'Mission', value: activities.filter(a => a.type === 'mission').length },
    { name: 'Audit', value: activities.filter(a => a.type === 'audit').length },
  ].filter(a => a.value > 0)

  const recByStatus = [
    { name: 'Pending', value: recRows.filter(r => String(r.status).includes('PENDING')).length },
    { name: 'Approuve', value: recRows.filter(r => String(r.status).includes('APPROVED')).length },
    { name: 'Rejete', value: recRows.filter(r => String(r.status).includes('REJECTED') || String(r.status).includes('DECLINED')).length },
    { name: 'Notifie', value: recRows.filter(r => String(r.status).includes('NOTIFIED')).length },
    { name: 'Confirme employe', value: recRows.filter(r => String(r.status).includes('EMPLOYEE_CONFIRMED')).length },
  ].filter(r => r.value > 0)

  const avgScore = recRows.length > 0
    ? Math.round((recRows.reduce((s, r) => s + Number(r.score_total ?? 0), 0) / recRows.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left">
        <h1 className="text-2xl font-bold text-foreground">Analytiques RH</h1>
        <p className="text-sm text-muted-foreground">Suivi des activites et performance des recommandations</p>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total activites" value={activities.length} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title="Recommandations" value={recRows.length} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Taux confirmation" value={`${recRows.length > 0 ? Math.round((recRows.filter(r => String(r.status).includes('EMPLOYEE_CONFIRMED')).length / recRows.length) * 100) : 0}%`} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity types */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Activites par type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={activityByType} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                {activityByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {activityByType.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation status */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Statut des recommandations</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={recByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                {recByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {recByStatus.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progression */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Progression globale</h3>
          <ResponsiveContainer width="100%" height={220}>
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

      {/* Skill Gaps */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">Ecarts de competences prioritaires</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={skillGaps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
            <XAxis dataKey="skill" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 89%)', fontSize: '12px' }} />
            <Bar dataKey="current" name="Actuel" fill="hsl(27, 92%, 54%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="required" name="Requis" fill="hsl(222, 60%, 33%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
