import { useMemo, useRef, useState } from 'react'
import {
  FileText, Download, Eraser, Bold, Italic, Underline, List, ListOrdered, CalendarDays, Wand2, SendHorizontal, X,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useToast } from '../../../hooks/use-toast'
import { rewritePrompt } from '../../api/chat'

function sanitizeFilename(input: string): string {
  const normalized = input.trim().replace(/\s+/g, '_')
  const clean = normalized.replace(/[^a-zA-Z0-9_-]/g, '')
  return clean.length > 0 ? clean : 'rapport_rh'
}

const TYPING_DELAY_MS = 24
const REPORT_REWRITE_CONSTRAINTS =
  "Reecris ce rapport RH en francais professionnel. Retourne exactement 12 lignes. La premiere ligne doit commencer par 'Introduction:' et la derniere par 'Conclusion:'. Le contenu doit etre clair, factuel et formel."

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function toStyledReportHtml(text: string): string {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const lines = rawLines.slice(0, 12)
  while (lines.length < 12) lines.push('-')

  return lines
    .map((line, idx) => {
      const color = idx % 2 === 0 ? '#166534' : '#111827'
      return `<p style="margin:0 0 8px 0;color:${color};font-weight:${idx === 0 || idx === 11 ? 600 : 400};">${escapeHtml(line)}</p>`
    })
    .join('')
}

export default function HRReports() {
  const { toast } = useToast()
  const editorRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('Rapport RH')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showRewriteBox, setShowRewriteBox] = useState(false)
  const [rewriteInput, setRewriteInput] = useState('')

  const formattedSavedTime = useMemo(() => {
    if (!lastSavedAt) return 'Non enregistre'
    return lastSavedAt.toLocaleString('fr-FR')
  }, [lastSavedAt])

  const applyFormat = (command: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false)
  }

  const insertCurrentDate = () => {
    editorRef.current?.focus()
    document.execCommand('insertText', false, new Date().toLocaleDateString('fr-FR'))
  }

  const handleClear = () => {
    if (!editorRef.current) return
    editorRef.current.innerHTML = ''
    toast({ title: 'Editeur vide', description: 'Le contenu du rapport a ete supprime.', variant: 'success' })
  }

  const handleExportDoc = () => {
    try {
      const content = editorRef.current?.innerHTML?.trim() ?? ''
      const safeTitle = sanitizeFilename(title)
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${content}</body></html>`
      const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${safeTitle}.doc`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast({ title: 'Export DOCS', description: 'Le document a ete telecharge avec succes.', variant: 'success' })
    } catch {
      toast({ title: 'Erreur export DOCS', description: "Impossible d'exporter le document.", variant: 'destructive' })
    }
  }

  const handleExportPdf = () => {
    try {
      const safeTitle = sanitizeFilename(title)
      const text = editorRef.current?.innerText?.trim() ?? ''
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      doc.setFontSize(16)
      doc.setTextColor(22, 101, 52)
      doc.text(title || 'Rapport RH', 14, 16)

      let y = 28
      const left = 14
      const right = 194
      const lineHeight = 6
      const pageBottom = 282
      const renderLines = lines.length > 0 ? lines : ['Aucun contenu.']

      for (let i = 0; i < renderLines.length; i += 1) {
        const line = renderLines[i]
        const wrapped = doc.splitTextToSize(line, right - left)
        const color = i % 2 === 0 ? [22, 101, 52] : [17, 24, 39]
        const isEdgeLine = i === 0 || i === renderLines.length - 1
        doc.setTextColor(color[0], color[1], color[2])
        doc.setFont('helvetica', isEdgeLine ? 'bold' : 'normal')
        for (const segment of wrapped) {
          if (y > pageBottom) {
            doc.addPage()
            y = 18
          }
          doc.text(segment, left, y)
          y += lineHeight
        }
        y += 2
      }

      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Exporte le ${new Date().toLocaleString('fr-FR')}`, 14, 290)
      doc.save(`${safeTitle}.pdf`)
      toast({ title: 'Export PDF', description: 'Le PDF a ete telecharge avec succes.', variant: 'success' })
    } catch {
      toast({ title: 'Erreur export PDF', description: "Impossible d'exporter le PDF.", variant: 'destructive' })
    }
  }

  const animateWordsInEditor = async (finalText: string) => {
    if (!editorRef.current) return
    const chars = finalText.split('')
    setIsTyping(true)
    let rendered = ''
    for (let i = 0; i < chars.length; i += 1) {
      rendered += chars[i]
      // Simulate live typing with a blinking-like cursor marker.
      editorRef.current.innerText = `${rendered} ▌`
      setRewriteInput(`${rendered} ▌`)
      await new Promise((resolve) => setTimeout(resolve, TYPING_DELAY_MS))
    }
    editorRef.current.innerText = rendered
    editorRef.current.innerHTML = toStyledReportHtml(rendered)
    setRewriteInput(rendered)
    setIsTyping(false)
  }

  const handleSmartRewrite = async () => {
    const rawText = rewriteInput.trim() || editorRef.current?.innerText?.trim() || ''
    if (!rawText) {
      toast({ title: 'Contenu vide', description: 'Ajoutez du texte avant la correction intelligente.', variant: 'destructive' })
      return
    }

    setIsCorrecting(true)
    // Close the full-screen panel immediately on send,
    // while keeping live typing visible in the report editor.
    setShowRewriteBox(false)
    try {
      const response = await rewritePrompt({
        prompt: rawText,
        targetLanguage: 'fr',
        outputFormat: 'text',
        constraints: REPORT_REWRITE_CONSTRAINTS,
      })

      await animateWordsInEditor(response.rewritten)
      setRewriteInput(response.rewritten)
      toast({ title: 'Rapport corrige', description: 'La reformulation intelligente est terminee.', variant: 'success' })
    } catch (e: any) {
      toast({
        title: 'Erreur de reformulation',
        description: typeof e?.message === 'string' ? e.message : 'Impossible de corriger le rapport.',
        variant: 'destructive',
      })
    } finally {
      setIsCorrecting(false)
    }
  }

  const handleLoadSaved = () => {
    const savedTitle = localStorage.getItem('hr_report_title')
    const savedContent = localStorage.getItem('hr_report_content')
    if (savedTitle) setTitle(savedTitle)
    if (editorRef.current && savedContent !== null) {
      editorRef.current.innerHTML = savedContent
      setRewriteInput(editorRef.current.innerText ?? '')
      toast({ title: 'Sauvegarde chargee', description: 'Le dernier brouillon a ete restaure.', variant: 'success' })
    } else {
      toast({ title: 'Aucune sauvegarde', description: 'Aucun brouillon local disponible.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Rapport RH</h1>
          </div>
          <p className="text-xs text-muted-foreground">Derniere sauvegarde: {formattedSavedTime}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-micro rounded-lg border px-3 py-2"
            placeholder="Titre du rapport"
          />
          <button
            onClick={() => setShowRewriteBox((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Wand2 className="h-4 w-4" />
            Reformuler un rapport
          </button>
        </div>

        {showRewriteBox && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`w-full max-w-4xl rounded-2xl border shadow-xl ${isCorrecting ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Rapport RH - Maghrebia Assurances</p>
                  <h2 className="text-lg font-semibold text-foreground">Assistant de reformulation intelligente</h2>
                  <p className="text-xs text-muted-foreground">Correction professionnelle et style corporate pour communication RH.</p>
                </div>
                <button
                  onClick={() => setShowRewriteBox(false)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Texte brut a reformuler</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRewriteInput("Ecrire un rapport RH: le manager n'a realise aucune action de suivi et plusieurs employes etaient absents sans justification. Reformuler avec un ton professionnel, 12 lignes, introduction et conclusion.")}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Exemple prompt
                    </button>
                    <button onClick={handleLoadSaved} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                      Charger sauvegarde
                    </button>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={rewriteInput}
                    onChange={(e) => setRewriteInput(e.target.value)}
                    placeholder="Ecrivez ici le texte a reformuler..."
                    className="min-h-[240px] w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSmartRewrite}
                    disabled={isCorrecting}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    title="Envoyer pour reformulation"
                  >
                    <SendHorizontal className="h-5 w-5" />
                  </button>
                </div>
                <p className={`mt-3 text-xs ${isCorrecting ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isCorrecting
                    ? (isTyping ? 'Reformulation dynamique en cours... curseur actif.' : 'Reformulation en cours...')
                    : 'Ce panneau plein ecran se ferme automatiquement apres l envoi et la reformulation.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
          <button onClick={() => applyFormat('bold')} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Gras">
            <Bold className="h-4 w-4" />
          </button>
          <button onClick={() => applyFormat('italic')} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Italique">
            <Italic className="h-4 w-4" />
          </button>
          <button onClick={() => applyFormat('underline')} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Souligne">
            <Underline className="h-4 w-4" />
          </button>
          <button onClick={() => applyFormat('insertUnorderedList')} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Liste">
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => applyFormat('insertOrderedList')} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Liste numerotee">
            <ListOrdered className="h-4 w-4" />
          </button>
          <button onClick={insertCurrentDate} className="rounded-md border px-2 py-1 text-sm hover:bg-accent" title="Inserer date">
            <CalendarDays className="h-4 w-4" />
          </button>
          <button onClick={handleClear} className="ml-auto rounded-md border px-2 py-1 text-sm hover:bg-destructive/10" title="Vider">
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[420px] rounded-lg border border-border bg-background p-4 text-sm leading-6 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <p><strong>Introduction</strong></p>
          <p>Redigez ici votre rapport RH...</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={handleExportDoc} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" />
            Sauvegarder DOCS
          </button>
          <button onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" />
            Sauvegarder PDF
          </button>
        </div>
      </div>
    </div>
  )
}

