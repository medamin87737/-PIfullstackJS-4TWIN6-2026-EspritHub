import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/shared/StatCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { ClipboardList, Bell, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useI18n } from '../../hooks/useI18n'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type MyRecommendation = {
  _id: string
  status: string
  score_total?: number
  created_at?: string
  parsed_activity?: {
    required_skills?: Array<{ intitule?: string }>
  }
}

export default function EmployeeDashboard() {
  const { getUnreadCount, getUserNotifications, fetchWithAuth } = useData()
  const { user } = useAuth()
  const t = useI18n()
  const [myRecs, setMyRecs] = useState<MyRecommendation[]>([])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/my`)
        if (!res.ok) return
        const rows = await res.json()
        setMyRecs(Array.isArray(rows) ? rows : [])
      } catch {
        setMyRecs([])
      }
    }
    void load()
  }, [fetchWithAuth, user])

  const accepted = myRecs.filter((r) => ['EMPLOYEE_CONFIRMED', 'MANAGER_APPROVED', 'APPROVED', 'accepted', 'confirmed'].includes(String(r.status)))
  const pending = myRecs.filter((r) => ['PENDING', 'NOTIFIED', 'recommended'].includes(String(r.status)))
  const unread = user ? getUnreadCount(user.id) : 0
  const recentNotifs = user ? getUserNotifications(user.id).slice(0, 3) : []

  const userCompetences = useMemo(() => {
    const names = new Set<string>()
    const rows: Array<{ id: string; intitule: string; type: string; auto_eval: number; hierarchie_eval: number }> = []
    for (const rec of myRecs) {
      const skills = Array.isArray(rec?.parsed_activity?.required_skills)
        ? rec.parsed_activity!.required_skills!
        : []
      for (const s of skills) {
        const n = String(s?.intitule ?? '').trim()
        if (!n || names.has(n.toLowerCase())) continue
        names.add(n.toLowerCase())
        rows.push({
          id: n,
          intitule: n,
          type: 'knowledge',
          auto_eval: 6,
          hierarchie_eval: 7,
        })
      }
    }
    return rows
  }, [myRecs])

  const progressionData = useMemo(() => {
    const now = new Date()
    const points: Array<{ month: string; score: number }> = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const monthRows = myRecs.filter((r) => {
        const created = r.created_at ? new Date(r.created_at) : null
        if (!created || Number.isNaN(created.getTime())) return false
        return `${created.getFullYear()}-${created.getMonth()}` === key
      })
      const avg = monthRows.length > 0
        ? Math.round((monthRows.reduce((s, r) => s + Number(r.score_total ?? 0), 0) / monthRows.length) * 100)
        : 0
      points.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short' }),
        score: avg,
      })
    }
    return points
  }, [myRecs])

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.employee.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.employee.subtitle')} {user?.name}
        </p>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('dashboard.employee.card.proposedActivities')} value={myRecs.length} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title={t('dashboard.employee.card.participations')} value={accepted.length} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard title={t('dashboard.employee.card.pending')} value={pending.length} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title={t('dashboard.employee.card.notifications')} value={unread} icon={<Bell className="h-5 w-5" />} />
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My skills */}
        <div className="reveal reveal-right rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">{t('dashboard.employee.section.mySkills')}</h3>
          {userCompetences.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('dashboard.employee.section.noSkills')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {userCompetences.map(c => (
                <div key={c.id} className="flex items-center justify-between transition-all hover:translate-x-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-card-foreground">{c.intitule}</span>
                    <StatusBadge status={c.type} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Auto</span>
                        <div className="h-1.5 w-20 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.auto_eval / 10) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{c.auto_eval}/10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Mgr</span>
                        <div className="h-1.5 w-20 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-secondary" style={{ width: `${(c.hierarchie_eval / 10) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{c.hierarchie_eval}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progression chart */}
        <div className="reveal reveal-scale rounded-xl border border-border bg-card p-5 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">{t('dashboard.employee.section.progression')}</h3>
          <ResponsiveContainer width="100%" height={200}>
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

      {/* Recent notifications */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card card-animated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">{t('dashboard.employee.section.recentNotifications')}</h3>
          <Link to="/employee/notifications" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('dashboard.employee.section.viewAll')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentNotifs.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t('dashboard.employee.section.noNotifications')}</p>
          ) : (
            recentNotifs.map(n => (
              <div key={n.id} className="flex items-center justify-between px-5 py-3 transition-all hover:bg-muted/30">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.message}</span>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
