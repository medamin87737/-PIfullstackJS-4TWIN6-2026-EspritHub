import { useMemo, useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
import { rewritePrompt } from '../../api/chat'

export default function PromptRewriter() {
  const [prompt, setPrompt] = useState('')
  const [constraints, setConstraints] = useState(
    "Reponds par une seule ligne. Utilise un style imperatif. Pas d'explication."
  )
  const [targetLanguage, setTargetLanguage] = useState('fr')
  const [outputFormat, setOutputFormat] = useState<'text' | 'json'>('text')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewritten, setRewritten] = useState<string>('')
  const [model, setModel] = useState<string>('')

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading])

  const onSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setRewritten('')
    setModel('')
    try {
      const res = await rewritePrompt({
        prompt,
        constraints: constraints.trim() ? constraints : undefined,
        targetLanguage,
        outputFormat,
      })
      setRewritten(res.rewritten)
      setModel(res.model)
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!rewritten) return
    await navigator.clipboard.writeText(rewritten)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reformulation</h1>
          <p className="text-sm text-muted-foreground">
            Reformule le prompt utilisateur dans un format strict pour ton modele NLP.
          </p>
        </div>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? 'Reformulation...' : 'Reformuler'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Prompt utilisateur
            </label>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Je veux planifier une formation React la semaine prochaine pour 5 personnes..."
            className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Langue de sortie
              </label>
              <input
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="fr"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Format
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as any)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="text">Texte</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Contraintes (langage strict)
            </label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Decris les regles que ton modele NLP exige..."
              className="mt-2 min-h-[120px] w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Sortie</p>
              {model && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Model: <span className="font-medium">{model}</span>
                </p>
              )}
            </div>
            <button
              onClick={copy}
              disabled={!rewritten}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
              title="Copier"
            >
              <Copy className="h-4 w-4" />
              Copier
            </button>
          </div>

          <pre className="min-h-[360px] whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-3 text-sm text-foreground">
{rewritten || 'La reformulation apparaitra ici.'}
          </pre>
        </div>
      </div>
    </div>
  )
}

