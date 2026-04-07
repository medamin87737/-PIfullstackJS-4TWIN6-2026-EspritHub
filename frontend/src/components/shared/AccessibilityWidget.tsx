import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { Globe } from 'lucide-react'

const TOAST_SOUND_ENABLED_KEY = 'accessibility_toast_sound_enabled'

export default function AccessibilityWidget() {
  const {
    zoom,
    setZoom,
    autoReadSelection,
    setAutoReadSelection,
    voiceCommandsActive,
    toggleVoiceCommands,
    colorBlindMode,
    toggleColorBlindMode,
    customPalette,
    setCustomPalette,
    resetCustomPalette,
    contrastPercent,
    setContrastPercent,
  } = useAccessibility()

  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef<HTMLDivElement | null>(null)
  const readRef = useRef<HTMLDivElement | null>(null)
  const voiceRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)
  const colorblindRef = useRef<HTMLDivElement | null>(null)
  const paletteRef = useRef<HTMLDivElement | null>(null)
  const contrastRef = useRef<HTMLDivElement | null>(null)
  const [paletteDraft, setPaletteDraft] = useState(() => ({
    primary: customPalette?.primary ?? '#ff7a1a',
    secondary: customPalette?.secondary ?? '#1e3a8a',
    background: customPalette?.background ?? '#f6f8fb',
    foreground: customPalette?.foreground ?? '#1f2937',
    accent: customPalette?.accent ?? '#ffe8d6',
    sidebarBackground: customPalette?.sidebarBackground ?? '#1e3a8a',
    sidebarForeground: customPalette?.sidebarForeground ?? '#e5e7eb',
  }))
  const [toastSoundEnabled, setToastSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(TOAST_SOUND_ENABLED_KEY) !== 'false'
  })

  const toggleToastSound = () => {
    const next = !toastSoundEnabled
    setToastSoundEnabled(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOAST_SOUND_ENABLED_KEY, String(next))
    }
  }

  const scrollToSection = (el: HTMLDivElement | null) => {
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollPanelBy = (delta: number) => {
    const el = panelRef.current
    if (!el) return
    el.scrollBy({ top: delta, behavior: 'smooth' })
  }

  // Fermer le panneau quand on clique en dehors
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={widgetRef} className="fixed bottom-4 right-4 z-40">
      <div className="relative">
        {/* Panel (au-dessus du bouton, sans bouger le logo) */}
        {open && (
          <div className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-card p-4 text-sm shadow-2xl">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Accessibilite
          </h2>

          {/* Navigation interne (ancres) */}
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => scrollToSection(zoomRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Texte
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(readRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Lecture
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(voiceRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Vocal
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(toastRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Son
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(contrastRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Contraste
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(colorblindRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Daltonien
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(paletteRef.current)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
            >
              Palette
            </button>
          </div>

          {/* Contenu scrollable */}
          <div ref={panelRef} className="max-h-96 overflow-auto pr-1">

          {/* Zoom text */}
          <div ref={zoomRef} className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Taille du texte</p>
            <div className="inline-flex rounded-md border border-input bg-background p-0.5">
              <button
                type="button"
                onClick={() => setZoom('normal')}
                className={`px-2 py-1 text-xs ${
                  zoom === 'normal'
                    ? 'rounded-md bg-primary text-primary-foreground'
                    : 'text-foreground'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setZoom('large')}
                className={`px-2 py-1 text-xs ${
                  zoom === 'large'
                    ? 'rounded-md bg-primary text-primary-foreground'
                    : 'text-foreground'
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setZoom('xlarge')}
                className={`px-2 py-1 text-xs ${
                  zoom === 'xlarge'
                    ? 'rounded-md bg-primary text-primary-foreground'
                    : 'text-foreground'
                }`}
              >
                A++
              </button>
            </div>
          </div>

          {/* Vocal reader auto switch */}
          <div ref={readRef} className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Lecture vocale automatique</p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>Off</span>
              <button
                type="button"
                onClick={() => setAutoReadSelection(!autoReadSelection)}
                className={`relative h-5 w-9 rounded-full border transition-colors ${
                  autoReadSelection ? 'bg-primary border-primary' : 'bg-background border-input'
                }`}
                aria-pressed={autoReadSelection}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    autoReadSelection ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span>On</span>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Quand c&apos;est active, tout texte que vous selectionnez est lu automatiquement.
            </p>
          </div>

          {/* Voice commands */}
          <div ref={voiceRef} className="mb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Commandes vocales</p>
            <button
              type="button"
              onClick={toggleVoiceCommands}
              className={`w-full rounded-md px-2 py-1 text-xs ${
                voiceCommandsActive
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {voiceCommandsActive ? 'Desactiver les commandes vocales' : 'Activer les commandes vocales'}
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Dites par exemple &quot;se connecter&quot; / &quot;login&quot; sur la page de connexion.
            </p>
          </div>

          {/* Toast sound switch */}
          <div ref={toastRef} className="mb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Son des popups</p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>Off</span>
              <button
                type="button"
                onClick={toggleToastSound}
                className={`relative h-5 w-9 rounded-full border transition-colors ${
                  toastSoundEnabled ? 'bg-primary border-primary' : 'bg-background border-input'
                }`}
                aria-pressed={toastSoundEnabled}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    toastSoundEnabled ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span>On</span>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Active ou desactive le son des notifications de succes/erreur.
            </p>
          </div>

          {/* Display contrast */}
          <div ref={contrastRef} className="mb-3 rounded-lg border border-border bg-background/60 p-2.5">
            <p className="mb-1 text-xs font-medium text-foreground">Contraste d&apos;affichage</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={75}
                max={150}
                step={5}
                value={contrastPercent}
                onChange={(e) => setContrastPercent(parseInt(e.target.value, 10))}
                aria-label="Ajuster le contraste"
                className="w-full"
              />
              <span className="w-10 text-right text-[11px] text-muted-foreground">{contrastPercent}%</span>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setContrastPercent(100)}
                className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                Par défaut
              </button>
            </div>
          </div>

          {/* Colorblind mode */}
          <div ref={colorblindRef} className="mb-2 rounded-lg border border-border bg-background/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-foreground">Mode daltonien</p>
                <p className="text-[11px] text-muted-foreground">
                  Palette haute visibilité (bleu/jaune) pour deutéranopie et protanopie.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleColorBlindMode}
                className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
                  colorBlindMode ? 'bg-[#0072B2] border-[#0072B2]' : 'bg-background border-input'
                }`}
                aria-pressed={colorBlindMode}
                aria-label="Activer le mode daltonien"
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    colorBlindMode ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>
            {colorBlindMode && (
              <p className="mt-1.5 text-[11px] font-medium text-[#0072B2]">
                ✓ Mode daltonien actif — couleurs adaptées
              </p>
            )}
          </div>

          {/* Palette de couleurs personnalisée */}
          <div ref={paletteRef} className="mb-3 rounded-lg border border-border bg-background/60 p-2.5">
            <p className="mb-2 text-xs font-medium text-foreground">Palette de couleurs</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Primaire</span>
                <input
                  type="color"
                  value={paletteDraft.primary}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, primary: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur primaire"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Secondaire</span>
                <input
                  type="color"
                  value={paletteDraft.secondary}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, secondary: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur secondaire"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Arrière-plan</span>
                <input
                  type="color"
                  value={paletteDraft.background}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, background: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur d'arrière-plan"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Texte</span>
                <input
                  type="color"
                  value={paletteDraft.foreground}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, foreground: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur du texte"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Accent</span>
                <input
                  type="color"
                  value={paletteDraft.accent}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, accent: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur d'accent"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Sidebar fond</span>
                <input
                  type="color"
                  value={paletteDraft.sidebarBackground}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, sidebarBackground: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur de fond de la barre latérale"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Sidebar texte</span>
                <input
                  type="color"
                  value={paletteDraft.sidebarForeground}
                  onChange={(e) => {
                    const v = e.target.value
                    const next = { ...paletteDraft, sidebarForeground: v }
                    setPaletteDraft(next)
                    setCustomPalette(next)
                  }}
                  aria-label="Couleur de texte de la barre latérale"
                  className="h-6 w-10 cursor-pointer rounded border border-input bg-background p-0"
                />
              </label>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetCustomPalette()
                  const reset = {
                    primary: '#ff7a1a',
                    secondary: '#1e3a8a',
                    background: '#f6f8fb',
                    foreground: '#1f2937',
                    accent: '#ffe8d6',
                    sidebarBackground: '#1e3a8a',
                    sidebarForeground: '#e5e7eb',
                  }
                  setPaletteDraft(reset)
                }}
                className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Astuce : vous pouvez aussi utiliser les fonctions de traduction integrees du navigateur pour d&apos;autres
            langues.
          </p>
          </div>

          {/* Contrôles de défilement du panneau */}
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
              aria-label="Aller en haut du panneau"
            >
              Haut
            </button>
            <button
              type="button"
              onClick={() => scrollPanelBy(-160)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
              aria-label="Faire défiler vers le haut"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => scrollPanelBy(160)}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
              aria-label="Faire défiler vers le bas"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                if (!panelRef.current) return
                panelRef.current.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' })
              }}
              className="rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent hover:text-accent-foreground"
              aria-label="Aller en bas du panneau"
            >
              Bas
            </button>
          </div>
          </div>
        )}

        {/* Toggle button (logo fixe) */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Options d'accessibilite"
        >
          <span className="sr-only">Accessibilite</span>
          {/* Simple accessibility icon */}
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="4" r="2" />
            <path d="M4 7h16l-2 3-3 1v5l-2 4-2-4v-5l-3-1-2-3Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

