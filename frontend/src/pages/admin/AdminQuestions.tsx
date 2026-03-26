import { useData } from '../../context/DataContext'
import DataTable from '../../components/shared/DataTable'
import StatusBadge from '../../components/shared/StatusBadge'
import type { QuestionCompetence } from '../../types'

export default function AdminQuestions() {
  const { questionCompetences } = useData()

  const columns = [
    { key: 'id', header: 'ID', render: (q: QuestionCompetence) => <span className="font-mono text-xs text-muted-foreground">#{q.id}</span> },
    { key: 'intitule', header: 'Categorie', render: (q: QuestionCompetence) => <span className="font-medium">{q.intitule}</span> },
    { key: 'details', header: 'Details', render: (q: QuestionCompetence) => <span className="text-sm text-muted-foreground max-w-md truncate block">{q.details}</span> },
    { key: 'status', header: 'Statut', render: (q: QuestionCompetence) => <StatusBadge status={q.status} /> },
    {
      key: 'created_at', header: 'Cree le', render: (q: QuestionCompetence) =>
        <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString('fr-FR')}</span>
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal reveal-left animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Questions de competences</h1>
        <p className="text-sm text-muted-foreground">{questionCompetences.length} categories de competences</p>
      </div>

      <div className="reveal reveal-right">
        <DataTable columns={columns} data={questionCompetences} emptyMessage="Aucune question" />
      </div>
    </div>
  )
}
