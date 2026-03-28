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
  } = useAccessibility()

  const { language, setLanguage, isTranslating, supportedLanguages, translatePage } = useTranslation()

  const [open, setOpen] = useState(false)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
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

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative">
        {/* Panel (au-dessus du bouton, sans bouger le logo) */}
        {open && (
          <div className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-card p-4 text-sm shadow-2xl">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Accessibilite
          </h2>

          {/* Zoom text */}
          <div className="mb-3">
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

          {/* Language - Nouveau sélecteur toutes langues */}
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Traduction (API externe)
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                disabled={isTranslating}
                className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>
                    {supportedLanguages.find(l => l.code === language)?.flag} {' '}
                    {supportedLanguages.find(l => l.code === language)?.name || 'Français'}
                  </span>
                </span>
                <span className="text-muted-foreground">▼</span>
              </button>

              {showLangDropdown && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-input bg-card shadow-lg">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code as any)
                        setShowLangDropdown(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-accent ${
                        language === lang.code ? 'bg-accent' : ''
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              50+ langues via MyMemory API. Cliquez pour traduire la page.
            </p>
          </div>

          {/* Vocal reader auto switch */}
          <div className="mb-3">
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
          <div className="mb-2">
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
          <div className="mb-2">
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

          <p className="mt-2 text-[11px] text-muted-foreground">
            Astuce : vous pouvez aussi utiliser les fonctions de traduction integrees du navigateur pour d&apos;autres
            langues.
          </p>
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

