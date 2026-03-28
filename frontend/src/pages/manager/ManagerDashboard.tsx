import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/shared/StatCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { ClipboardList, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { Activity, User } from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export default function ManagerDashboard() {
  const { fetchWithAuth, getUnreadCount } = useData()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [myActivities, setMyActivities] = useState<Activity[]>([])
  const [myTeam, setMyTeam] = useState<User[]>([])
  const [pendingValidations, setPendingValidations] = useState(0)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setMyActivities([])
        setMyTeam([])
        setPendingValidations(0)
        return
      }
      try {
        const [activitiesRes, teamRes, pendingRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/manager/activities`),
          fetchWithAuth(`${API_BASE_URL}/manager/employees`),
          fetchWithAuth(`${API_BASE_URL}/api/recommendations/manager/pending`),
        ])

        if (activitiesRes.ok) {
          const payload = await activitiesRes.json()
          const rows = Array.isArray(payload?.activities) ? payload.activities : []
          const mapped: Activity[] = rows.map((a: any) => ({
            id: a?._id?.toString() ?? a?.id ?? crypto.randomUUID(),
            title: a?.title ?? '',
            description: a?.description ?? '',
            type: a?.type ?? 'training',
            required_skills: (a?.requiredSkills ?? []).map((s: any) => ({
              skill_name: s?.skill_name ?? '',
              desired_level: s?.desired_level ?? 'medium',
            })),
            seats: a?.maxParticipants ?? 0,
            date: a?.startDate ? new Date(a.startDate).toISOString() : new Date().toISOString(),
            end_date: a?.endDate ? new Date(a.endDate).toISOString() : undefined,
            duration: a?.duration ?? 'N/A',
            location: a?.location ?? 'N/A',
            priority: a?.priority ?? 'consolidate_medium',
            status: a?.status ?? 'open',
            created_by: a?.created_by ?? 'HR',
            assigned_manager: user.id,
            created_at: a?.createdAt ?? new Date().toISOString(),
            updated_at: a?.updatedAt ?? new Date().toISOString(),
          }))
          setMyActivities(mapped)
        } else {
          setMyActivities([])
        }

        if (teamRes.ok) {
          const payload = await teamRes.json()
          const rows = Array.isArray(payload?.employees) ? payload.employees : []
          const mapped: User[] = rows.map((u: any) => ({
            id: String(u?._id ?? u?.id ?? ''),
            name: String(u?.name ?? ''),
            matricule: String(u?.matricule ?? ''),
            telephone: String(u?.telephone ?? ''),
            email: String(u?.email ?? ''),
            password: '',
            date_embauche: u?.date_embauche ? new Date(u.date_embauche).toISOString() : new Date().toISOString(),
            departement_id: String(u?.department_id ?? ''),
            manager_id: u?.manager_id ? String(u.manager_id) : null,
            status: String(u?.status ?? '').toLowerCase() === 'inactive' ? 'inactive' : String(u?.status ?? '').toLowerCase() === 'suspended' ? 'suspended' : 'active',
            en_ligne: Boolean(u?.en_ligne),
            role: 'EMPLOYEE',
            avatar: u?.avatar,
          }))
          setMyTeam(mapped)
        } else {
          setMyTeam([])
        }

        if (pendingRes.ok) {
          const payload = await pendingRes.json()
          setPendingValidations(Array.isArray(payload) ? payload.length : 0)
        } else {
          setPendingValidations(0)
        }
      } catch {
        setMyActivities([])
        setMyTeam([])
        setPendingValidations(0)
      }
    }
    void load()
  }, [fetchWithAuth, user])

  const recentActivities = useMemo(() => myActivities.slice(0, 5), [myActivities])

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.manager.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.manager.subtitle')}</p>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('dashboard.manager.card.myActivities')} value={myActivities.length} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title={t('dashboard.manager.card.pendingValidations')} value={pendingValidations} icon={<Clock className="h-5 w-5" />} />
        <StatCard title={t('dashboard.manager.card.myTeam')} value={myTeam.length} icon={<Users className="h-5 w-5" />} />
        <StatCard title={t('dashboard.manager.card.notifications')} value={user ? getUnreadCount(user.id) : 0} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {/* Team members */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card card-animated">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">{t('dashboard.manager.section.myTeam')}</h3>
        </div>
        <div className="divide-y divide-border">
          {myTeam.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t('dashboard.manager.section.noTeam')}</p>
          ) : (
            myTeam.map(member => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3 transition-all hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-card-foreground">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${member.en_ligne ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <StatusBadge status={member.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activities assigned to me */}
      <div className="reveal reveal-scale rounded-xl border border-border bg-card card-animated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">{t('dashboard.manager.section.assignedActivities')}</h3>
          <Link to="/manager/activities" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('dashboard.manager.section.viewAll')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentActivities.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">{t('dashboard.manager.section.noAssignedActivities')}</p>
          ) : (
            recentActivities.map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 transition-all hover:bg-muted/30">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-card-foreground">{a.title}</span>
                  <span className="text-xs text-muted-foreground">{a.date} - {a.seats} places</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  <Link to={`/manager/activity/${a.id}`} className="text-xs font-medium text-primary hover:underline">Voir</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
