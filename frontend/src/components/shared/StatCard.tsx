import { cn } from '../../../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label: string }
  className?: string
}

export default function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('group rounded-xl border border-border bg-card p-5 card-animated', className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="text-2xl font-bold text-card-foreground">{value}</span>
          {trend && (
            <span className={cn('text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </div>
  )
}
