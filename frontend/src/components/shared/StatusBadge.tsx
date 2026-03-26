import { cn } from '../../../lib/utils'

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  validated: 'bg-emerald-100 text-emerald-700',
  submitted: 'bg-blue-100 text-blue-700',
  recommended: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  sent_to_manager: 'bg-amber-100 text-amber-700',
  waiting_employee_confirmation: 'bg-indigo-100 text-indigo-700',
  manager_rejected: 'bg-red-100 text-red-700',
  employee_confirmed: 'bg-emerald-100 text-emerald-700',
  employee_declined: 'bg-red-100 text-red-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  low: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-blue-100 text-blue-700',
  expert: 'bg-emerald-100 text-emerald-700',
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
  draft: 'Brouillon',
  open: 'Ouvert',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
  validated: 'Valide',
  submitted: 'Soumis',
  recommended: 'Recommande',
  confirmed: 'Confirme',
  rejected: 'Rejete',
  sent_to_manager: 'Envoye au manager',
  waiting_employee_confirmation: 'En attente employe',
  manager_rejected: 'Rejete par manager',
  employee_confirmed: 'Confirme par employe',
  employee_declined: 'Refuse par employe',
  accepted: 'Accepte',
  declined: 'Decline',
  low: 'Bas',
  medium: 'Moyen',
  high: 'Eleve',
  expert: 'Expert',
  develop_low: 'Dev. Bas',
  consolidate_medium: 'Consolider',
  exploit_expert: 'Expert',
  training: 'Formation',
  certification: 'Certification',
  project: 'Projet',
  mission: 'Mission',
  audit: 'Audit',
  knowledge: 'Savoir',
  know_how: 'Savoir-faire',
  soft_skills: 'Savoir-etre',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      statusStyles[status] ?? 'bg-gray-100 text-gray-600',
      className
    )}>
      {statusLabels[status] ?? status}
    </span>
  )
}
