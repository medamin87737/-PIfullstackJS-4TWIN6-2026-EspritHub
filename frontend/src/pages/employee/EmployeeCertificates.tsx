import { useEffect, useState, useCallback, useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { Award, Download, RefreshCw, Search } from 'lucide-react'
import { cn } from '../../../lib/utils'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type Certificate = {
  _id: string
  activityTitle: string
  employeeName: string
  rank: number
  issueDate: string
  created_at: string
}

export default function EmployeeCertificates() {
  const { fetchWithAuth } = useData()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  const token = useMemo(
    () => localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'),
    [],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/recommendations/certificates/my`, {
        headers: { 'x-toast-silent': 'true' },
      })
      if (res.ok) {
        const data = await res.json()
        setCertificates(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth, token])

  useEffect(() => { void load() }, [load])

  const filtered = certificates.filter(c =>
    c.activityTitle.toLowerCase().includes(search.toLowerCase()),
  )

  const download = async (id: string, title: string) => {
    setDownloading(id)
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/recommendations/certificates/${id}/download`,
        { headers: { 'x-toast-silent': 'true' } },
      )
      if (!res.ok) { alert('Certificat introuvable'); return }
      const { pdfData, filename } = await res.json()
      if (!pdfData) { alert('Données manquantes'); return }
      const a = document.createElement('a')
      a.href = pdfData
      a.download = filename ?? `certificat_${title}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      alert(`Erreur : ${e?.message ?? 'inconnue'}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="reveal reveal-left animate-slide-up flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Mes Certificats
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {certificates.length} certificat{certificates.length !== 1 ? 's' : ''} obtenu{certificates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Barre de recherche */}
      {certificates.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une activité..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16">
          <Award className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? 'Aucun certificat trouvé' : 'Aucun certificat pour le moment'}
          </p>
          {!search && (
            <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
              Vos certificats apparaîtront ici après validation de vos participations aux activités de formation.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cert) => (
            <div
              key={cert._id}
              className="group relative flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-900/10 dark:to-card p-5 transition-all hover:border-amber-400/60 hover:shadow-md"
            >
              {/* Badge rang */}
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/30">
                <span className="text-xs font-bold text-amber-600">#{cert.rank}</span>
              </div>

              {/* Icône */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-500" />
              </div>

              {/* Infos */}
              <div className="flex flex-col gap-1 pr-8">
                <span className="text-sm font-semibold text-card-foreground line-clamp-2">
                  {cert.activityTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  Délivré le {cert.issueDate}
                </span>
              </div>

              {/* Bouton télécharger */}
              <button
                onClick={() => download(cert._id, cert.activityTitle)}
                disabled={downloading === cert._id}
                className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-500/10 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {downloading === cert._id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {downloading === cert._id ? 'Téléchargement...' : 'Télécharger PDF'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
