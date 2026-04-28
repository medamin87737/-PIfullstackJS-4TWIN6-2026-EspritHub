import { useState } from 'react'
import { useAccessibility } from '../../context/AccessibilityContext'
import { useTranslation } from '../../context/TranslationContext'
import { Globe, Loader2 } from 'lucide-react'

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
    visualFatigueMode,
    toggleVisualFatigueMode,
  } = useAccessibility()
  const { language, setLanguage, translatePage, isTranslating, supportedLanguages } = useTranslation()

  const [open, setOpen] = useState(false)
  const [toastSoundEnabled, setToastSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(TOAST_SOUND_ENABLED_KEY) !== 'false'
  })

  const toggleToastSound = () => {
    const next = !toastSoundEnabled
    setToastSoundEnabled(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(TOAST_SOUND_ENABLED_KEY, String(next))
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as any)
    setTimeout(() => void translatePage(), 50)
  }

  const mainLanguages = supportedLanguages.filter(l => ['fr', 'en', 'ar', 'es', 'de', 'it'].includes(l.code))

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative">

        {open && (
          <div className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-card p-4 text-sm shadow-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accessibilite</h2>

            {/* Taille du texte */}
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Taille du texte</p>
            <div className="inline-flex rounded-md border border-input bg-background p-0.5">
                {(['normal', 'large', 'xlarge'] as const).map((z, i) => (
                  <button key={z} type="button" onClick={() => setZoom(z)}
                    className={`px-2 py-1 text-xs ${zoom === z ? 'rounded-md bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {['A', 'A+', 'A++'][i]}
              </button>
                ))}
              </div>
            </div>

            {/* Traduction */}
            <div className="mb-3 rounded-lg border border-border bg-background/60 p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground">Traduction de la page</p>
                {isTranslating && <Loader2 className="ml-auto h-3 w-3 animate-spin text-primary" />}
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Choisissez une langue pour traduire toute l'interface :
              </p>
              <div className="mb-2 flex flex-wrap gap-1">
                {mainLanguages.map(l => (
                  <button key={l.code} type="button" onClick={() => handleLanguageChange(l.code)}
                    title={`Traduire en ${l.name}`}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                      language === l.code
                        ? 'bg-primary text-primary-foreground ring-1 ring-primary/50'
                        : 'border border-input bg-background text-foreground hover:bg-accent'
                    }`}>
                    <span className="text-sm">{l.flag}</span>
                    <span>{l.name}</span>
                    {language === l.code && <span className="text-[9px] opacity-80">✓</span>}
              </button>
                ))}
              </div>
              <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {supportedLanguages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
              {language !== 'fr' && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-primary">
                    ✓ {supportedLanguages.find(l => l.code === language)?.name}
                  </p>
                  <button type="button" onClick={() => void translatePage()} disabled={isTranslating}
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 disabled:opacity-50">
                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                    {isTranslating ? 'Traduction...' : 'Retraduire'}
              </button>
            </div>
              )}
          </div>

            {/* Lecture vocale */}
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Lecture vocale automatique</p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>Off</span>
                <button type="button" onClick={() => setAutoReadSelection(!autoReadSelection)}
                  className={`relative h-5 w-9 rounded-full border transition-colors ${autoReadSelection ? 'bg-primary border-primary' : 'bg-background border-input'}`}
                  aria-pressed={autoReadSelection}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoReadSelection ? 'translate-x-4' : ''}`} />
              </button>
              <span>On</span>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Quand c&apos;est active, tout texte que vous selectionnez est lu automatiquement.
            </p>
          </div>

            {/* Commandes vocales */}
          <div className="mb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Commandes vocales</p>
              <button type="button" onClick={toggleVoiceCommands}
                className={`w-full rounded-md px-2 py-1 text-xs ${voiceCommandsActive ? 'bg-primary text-primary-foreground' : 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              {voiceCommandsActive ? 'Desactiver les commandes vocales' : 'Activer les commandes vocales'}
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Dites par exemple &quot;se connecter&quot; / &quot;login&quot; sur la page de connexion.
            </p>
          </div>

            {/* Son des popups */}
          <div className="mb-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Son des popups</p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>Off</span>
                <button type="button" onClick={toggleToastSound}
                  className={`relative h-5 w-9 rounded-full border transition-colors ${toastSoundEnabled ? 'bg-primary border-primary' : 'bg-background border-input'}`}
                  aria-pressed={toastSoundEnabled}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${toastSoundEnabled ? 'translate-x-4' : ''}`} />
              </button>
              <span>On</span>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Active ou desactive le son des notifications de succes/erreur.
            </p>
          </div>

            {/* Mode daltonien */}
            <div className="rounded-lg border border-border bg-background/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-foreground">Mode daltonien</p>
                <p className="text-[11px] text-muted-foreground">
                  Palette haute visibilité (bleu/jaune) pour deutéranopie et protanopie.
                </p>
              </div>
                <button type="button" onClick={toggleColorBlindMode}
                  className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${colorBlindMode ? 'bg-[#0072B2] border-[#0072B2]' : 'bg-background border-input'}`}
                  aria-pressed={colorBlindMode} aria-label="Activer le mode daltonien">
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${colorBlindMode ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {colorBlindMode && (
                <p className="mt-1.5 text-[11px] font-medium text-[#0072B2]">✓ Mode daltonien actif</p>
            )}
          </div>

            {/* Palette personnalisee */}
          <div className="mt-3 rounded-lg border border-border bg-background/60 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Palette de couleurs</p>
                  <p className="text-[11px] text-muted-foreground">Choisissez vos couleurs pour toute l'application.</p>
                </div>
                <button
                  type="button"
                  onClick={resetCustomPalette}
                  className="rounded-md border border-input bg-background px-2 py-1 text-[11px] hover:bg-accent"
                >
                  Reinitialiser
                </button>
              </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'primary', label: 'Primaire', fallback: '#2563eb' },
                  { key: 'secondary', label: 'Secondaire', fallback: '#64748b' },
                  { key: 'background', label: 'Fond', fallback: '#0b1220' },
                  { key: 'foreground', label: 'Texte', fallback: '#f8fafc' },
                  { key: 'accent', label: 'Accent', fallback: '#14b8a6' },
                  { key: 'sidebarBackground', label: 'Sidebar fond', fallback: '#111827' },
                  { key: 'sidebarForeground', label: 'Sidebar texte', fallback: '#e5e7eb' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                <input
                  type="color"
                      value={(customPalette as any)?.[item.key] ?? item.fallback}
                      onChange={(e) =>
                        setCustomPalette({
                          ...(customPalette ?? {}),
                          [item.key]: e.target.value,
                        } as any)
                      }
                      className="h-6 w-8 cursor-pointer rounded border border-input bg-transparent p-0"
                />
              </label>
                ))}
              </div>
            </div>

            {/* Contraste */}
            <div className="mt-3 rounded-lg border border-border bg-background/60 p-2.5">
              <div className="mb-3 rounded-md border border-border bg-card/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">Interface adaptee a la fatigue visuelle</p>
                    <p className="text-[11px] text-muted-foreground">
                      Active un filtre chaud qui diminue la lumiere bleue de l'ecran.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleVisualFatigueMode}
                    className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
                      visualFatigueMode ? 'border-amber-500 bg-amber-500' : 'border-input bg-background'
                    }`}
                    aria-pressed={visualFatigueMode}
                    aria-label="Activer le filtre anti lumiere bleue"
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        visualFatigueMode ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </div>
                {visualFatigueMode && (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-600">✓ Filtre anti lumiere bleue actif</p>
                )}
              </div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Contraste d'affichage</p>
              <button
                type="button"
                  onClick={() => setContrastPercent(100)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-[11px] hover:bg-accent"
              >
                  Par defaut
              </button>
              </div>
              <input
                type="range"
                min={75}
                max={150}
                step={1}
                value={contrastPercent}
                onChange={(e) => setContrastPercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Niveau actuel: {contrastPercent}%</p>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setOpen(prev => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Options d'accessibilite">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="4" r="2" />
            <path d="M4 7h16l-2 3-3 1v5l-2 4-2-4v-5l-3-1-2-3Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
