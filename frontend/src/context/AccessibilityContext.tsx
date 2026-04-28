import { createContext, useContext, useEffect, useRef, useState, type ReactNode, useCallback } from 'react'
import { hexToHsl } from '../utils/color'

type ZoomLevel = 'normal' | 'large' | 'xlarge'

interface AccessibilityContextType {
  zoom: ZoomLevel
  setZoom: (level: ZoomLevel) => void
  autoReadSelection: boolean
  setAutoReadSelection: (value: boolean) => void
  stopSpeaking: () => void
  speak: (text: string) => void
  voiceCommandsActive: boolean
  toggleVoiceCommands: () => void
  colorBlindMode: boolean
  toggleColorBlindMode: () => void
  customPalette: CustomPalette | null
  setCustomPalette: (palette: CustomPalette) => void
  resetCustomPalette: () => void
  contrastPercent: number
  setContrastPercent: (percent: number) => void
  visualFatigueMode: boolean
  toggleVisualFatigueMode: () => void
}

export type CustomPalette = {
  primary?: string
  secondary?: string
  background?: string
  foreground?: string
  accent?: string
  sidebarBackground?: string
  sidebarForeground?: string
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  // Default startup size: standard-plus (A+) for better readability.
  const [zoom, setZoomState] = useState<ZoomLevel>('large')
  const [autoReadSelection, setAutoReadSelectionState] = useState(false)
  const [voiceCommandsActive, setVoiceCommandsActive] = useState(false)
  const [colorBlindMode, setColorBlindMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('accessibility_colorblind') === 'true'
  })
  const [customPalette, setCustomPaletteState] = useState<CustomPalette | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem('accessibility_custom_palette')
      return raw ? (JSON.parse(raw) as CustomPalette) : null
    } catch {
      return null
    }
  })
  const [contrastPercent, setContrastPercentState] = useState<number>(() => {
    if (typeof window === 'undefined') return 100
    const raw = window.localStorage.getItem('accessibility_contrast_percent')
    const parsed = raw ? parseInt(raw, 10) : 100
    return Number.isFinite(parsed) ? parsed : 100
  })
  const [visualFatigueMode, setVisualFatigueMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('accessibility_visual_fatigue') === 'true'
  })

  const recognitionRef = useRef<any>(null)

  // Apply colorblind mode class on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('colorblind', colorBlindMode)
    window.localStorage.setItem('accessibility_colorblind', String(colorBlindMode))
  }, [colorBlindMode])

  const toggleColorBlindMode = useCallback(() => {
    setColorBlindMode((prev) => !prev)
  }, [])

  // Apply global contrast filter and anti-blue-light effect on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return
    const filters = [`contrast(${contrastPercent}%)`]
    if (visualFatigueMode) {
      // Warmer tones and reduced intensity to reduce visual fatigue.
      filters.push('sepia(18%)', 'hue-rotate(-12deg)', 'saturate(88%)', 'brightness(96%)')
    }
    document.documentElement.style.filter = filters.join(' ')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessibility_contrast_percent', String(contrastPercent))
      window.localStorage.setItem('accessibility_visual_fatigue', String(visualFatigueMode))
    }
  }, [contrastPercent, visualFatigueMode])

  const setContrastPercent = useCallback((percent: number) => {
    const clamped = Math.min(200, Math.max(50, Math.round(percent)))
    setContrastPercentState(clamped)
  }, [])

  const toggleVisualFatigueMode = useCallback(() => {
    setVisualFatigueMode((prev) => !prev)
  }, [])

  // Apply custom palette to CSS variables on :root
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const applyVar = (name: string, hex?: string) => {
      if (!hex) return
      const { h, s, l } = hexToHsl(hex)
      root.style.setProperty(name, `${h} ${s}% ${l}%`)
    }
    if (customPalette) {
      applyVar('--primary', customPalette.primary)
      applyVar('--secondary', customPalette.secondary)
      applyVar('--background', customPalette.background)
      applyVar('--foreground', customPalette.foreground)
      applyVar('--accent', customPalette.accent)
      applyVar('--sidebar-background', customPalette.sidebarBackground)
      applyVar('--sidebar-foreground', customPalette.sidebarForeground)
    }
  }, [customPalette])

  const setCustomPalette = useCallback((palette: CustomPalette) => {
    setCustomPaletteState(palette)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessibility_custom_palette', JSON.stringify(palette))
    }
  }, [])

  const resetCustomPalette = useCallback(() => {
    setCustomPaletteState(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('accessibility_custom_palette')
    }
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      // Remove inline overrides so Tailwind/CSS defaults take over
      ;[
        '--primary',
        '--secondary',
        '--background',
        '--foreground',
        '--accent',
        '--sidebar-background',
        '--sidebar-foreground',
      ].forEach((name) => root.style.removeProperty(name))
    }
  }, [])

  // Apply zoom to root font-size
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const base = 16
    const factor = zoom === 'normal' ? 1 : zoom === 'large' ? 1.15 : 1.3
    root.style.fontSize = `${base * factor}px`
  }, [zoom])

  const setZoom = useCallback((level: ZoomLevel) => {
    setZoomState(level)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return
      const synth = window.speechSynthesis
      if (!synth) {
        alert("La synthese vocale n'est pas supportee par ce navigateur.")
        return
      }
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      // Utiliser la langue du navigateur ou fr par défaut
      utterance.lang = document.documentElement.lang || 'fr-FR'
      synth.speak(utterance)
    },
    []
  )

  const speakSelection = useCallback(() => {
    if (typeof window === 'undefined') return
    const selection = window.getSelection()?.toString().trim()
    if (!selection) return
    speak(selection)
  }, [speak])

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
  }, [])

  // Automatic reading when selection changes and switch is ON
  useEffect(() => {
    if (!autoReadSelection) return
    if (typeof document === 'undefined') return

    let lastSelection = ''

    const handler = () => {
      const selection = window.getSelection()?.toString().trim() ?? ''
      if (!selection || selection === lastSelection) return
      lastSelection = selection
      speakSelection()
    }

    document.addEventListener('mouseup', handler)
    document.addEventListener('keyup', handler)

    return () => {
      document.removeEventListener('mouseup', handler)
      document.removeEventListener('keyup', handler)
    }
  }, [autoReadSelection, speakSelection])

  const handleVoiceCommand = useCallback(
    (text: string) => {
      const raw = text.trim()
      const lower = raw.toLowerCase()

      let detail: any = { raw, command: lower }

      const unknownMessage = "Je ne comprends pas votre commande vocale."

      const dispatchDetail = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('skillup-voice-command', {
              detail,
            }),
          )
        }
      }

      // Submit / login
      if (/(login|se connecter|connexion|sign in)/.test(lower)) {
        detail.type = 'submit'
        dispatchDetail()
        return
      }

      // Email command: "email admin@example.com"
      if (/(email|adresse mail|mail)/.test(lower)) {
        const idx =
          lower.indexOf('email') !== -1
            ? lower.indexOf('email') + 'email'.length
            : lower.indexOf('adresse mail') !== -1
              ? lower.indexOf('adresse mail') + 'adresse mail'.length
              : lower.indexOf('mail') + 'mail'.length

        const value = raw.slice(idx).trim()
        if (!value) {
          speak(unknownMessage)
          return
        }
        detail.type = 'email'
        detail.value = value
        dispatchDetail()
        return
      }

      // Password command: "mot de passe xxx" / "password xxx"
      if (/(mot de passe|password)/.test(lower)) {
        const idx =
          lower.indexOf('mot de passe') !== -1
            ? lower.indexOf('mot de passe') + 'mot de passe'.length
            : lower.indexOf('password') + 'password'.length

        const value = raw.slice(idx).trim()
        if (!value) {
          speak(unknownMessage)
          return
        }
        detail.type = 'password'
        detail.value = value
        dispatchDetail()
        return
      }

      // Unknown command -> speak error
      speak(unknownMessage)
    },
    [speak],
  )

  const toggleVoiceCommands = useCallback(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Les commandes vocales ne sont pas supportees par ce navigateur.')
      return
    }

    if (voiceCommandsActive) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setVoiceCommandsActive(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = document.documentElement.lang || 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript
      handleVoiceCommand(transcript)
    }

    recognition.onerror = () => {
      setVoiceCommandsActive(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // relancer automatiquement tant que l'utilisateur souhaite les commandes
      if (voiceCommandsActive) {
        recognition.start()
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setVoiceCommandsActive(true)
  }, [handleVoiceCommand, voiceCommandsActive])

  useEffect(
    () => () => {
      recognitionRef.current?.stop()
    },
    [],
  )

  return (
    <AccessibilityContext.Provider
      value={{
        zoom,
        setZoom,
        autoReadSelection,
        setAutoReadSelection: setAutoReadSelectionState,
        stopSpeaking,
        speak,
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
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}

