import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/shared/StatCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { ClipboardList, Users, Sparkles, CheckCircle, Plus, ArrowRight } from 'lucide-react'
import { useI18n } from '../../hooks/useI18n'

export default function HRDashboard() {
  const { activities, recommendations, users, getUnreadCount } = useData()
  const { user } = useAuth()
  const t = useI18n()

  const openActivities = activities.filter(a => a.status === 'open')
  const totalRecommended = recommendations.length
  const confirmed = recommendations.filter(r => r.status === 'confirmed' || r.status === 'accepted').length

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboard.hr.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.hr.subtitle')}</p>
        </div>
        <Link to="/hr/create-activity" className="button-micro gradient-surface flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nouvelle activite
        </Link>
      </div>

      <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('dashboard.hr.card.openActivities')} value={openActivities.length} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard title={t('dashboard.hr.card.recommendedEmployees')} value={totalRecommended} icon={<Sparkles className="h-5 w-5" />} />
        <StatCard title={t('dashboard.hr.card.confirmations')} value={confirmed} icon={<CheckCircle className="h-5 w-5" />} trend={{ value: 15, label: 'ce mois' }} />
        <StatCard title={t('dashboard.hr.card.notifications')} value={user ? getUnreadCount(user.id) : 0} icon={<Users className="h-5 w-5" />} />
      </div>

      {/* Recent activities */}
      <div className="reveal reveal-right rounded-xl border border-border bg-card card-animated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">{t('dashboard.hr.section.recentActivities')}</h3>
          <Link to="/hr/activities" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('dashboard.hr.section.viewAll')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {activities.slice(0, 4).map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 transition-all hover:bg-muted/30">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-card-foreground">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.date} - {a.seats} places</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.type} />
                <StatusBadge status={a.status} />
                <Link to={`/hr/recommendations/${a.id}`} className="text-xs font-medium text-primary hover:underline">
                  Recommandations
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
