import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import StatusBadge from '../../components/shared/StatusBadge'
import { Mail, Phone, Calendar, Building2, User } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type ApiCompetence = {
  _id?: string
  id?: string
  intitule?: string
  type?: string
  auto_eval?: number
  hierarchie_eval?: number
  etat?: string
}

export default function EmployeeProfile() {
  const { user } = useAuth()
  const { getDepartmentName, fetchWithAuth } = useData()
  const [userCompetences, setUserCompetences] = useState<ApiCompetence[]>([])

  if (!user) return null

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id) return
        const fichesRes = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}/fiches`)
        if (!fichesRes.ok) {
          setUserCompetences([])
          return
        }
        const fichesPayload = await fichesRes.json()
        const fiches = Array.isArray(fichesPayload?.fiches) ? fichesPayload.fiches : []
        const allCompetences: ApiCompetence[] = []
        for (const f of fiches) {
          const fid = String(f?._id ?? f?.id ?? '')
          if (!fid) continue
          const compRes = await fetchWithAuth(`${API_BASE_URL}/users/fiches/${fid}/competences`)
          if (!compRes.ok) continue
          const compPayload = await compRes.json()
          const competences = Array.isArray(compPayload?.competences) ? compPayload.competences : []
          allCompetences.push(...competences)
        }
        setUserCompetences(allCompetences)
      } catch {
        setUserCompetences([])
      }
    }
    void load()
  }, [fetchWithAuth, user?.id])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="reveal reveal-left animate-slide-up text-2xl font-bold text-foreground">Mon Profil</h1>

      <div className="reveal-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="reveal reveal-right rounded-xl border border-border bg-card p-6 card-animated">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-card-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.role}</p>
              <StatusBadge status={user.status} className="mt-2" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> {user.telephone}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" /> Embauche: {new Date(user.date_embauche).toLocaleDateString('fr-FR')}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" /> {getDepartmentName(user.departement_id)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" /> Matricule: {user.matricule}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="reveal reveal-scale col-span-2 rounded-xl border border-border bg-card p-6 card-animated">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Mes competences evaluees</h3>
          {userCompetences.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune competence disponible depuis MongoDB</p>
          ) : (
            <div className="flex flex-col gap-4">
              {userCompetences.map((c, idx) => (
                <div key={`${String(c._id ?? c.id ?? idx)}`} className="rounded-lg border border-border bg-background p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-card-foreground">{String(c.intitule ?? 'N/A')}</span>
                      <StatusBadge status={String(c.type ?? 'knowledge')} />
                      <StatusBadge status={String(c.etat ?? 'draft')} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Auto-evaluation</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${(Number(c.auto_eval ?? 0) / 10) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-card-foreground">{Number(c.auto_eval ?? 0)}/10</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Evaluation hierarchie</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-secondary" style={{ width: `${(Number(c.hierarchie_eval ?? 0) / 10) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-card-foreground">{Number(c.hierarchie_eval ?? 0)}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
