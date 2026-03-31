/**
 * useSpeechRecognition — Hook réutilisable pour la dictée vocale
 * via la Web Speech API native du navigateur (Chrome / Edge).
 *
 * - Fonctionne sans installation, sans clé API
 * - Supporte FR + EN (détection automatique selon la langue du navigateur)
 * - Transcription en temps réel (interim) + résultat final
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Typage minimal de la Web Speech API (non inclus dans lib.dom par défaut)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'error' | 'unsupported'

export function useSpeechRecognition(lang = 'fr-FR') {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')
  const [interimText, setInterimText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  /**
   * Démarre la reconnaissance vocale.
   * @param onFinalResult  Callback appelé avec le texte final transcrit
   */
  const startListening = useCallback(
    (onFinalResult: (text: string) => void) => {
      if (!isSupported) {
        setStatus('unsupported')
        setErrorMessage('Web Speech API non supportée sur ce navigateur. Utilisez Chrome ou Edge.')
        return
      }

      // Arrêter une session précédente si elle tourne encore
      recognitionRef.current?.abort()

      const SpeechRecognitionCtor =
        window.SpeechRecognition ?? window.webkitSpeechRecognition!
      const recognition = new SpeechRecognitionCtor()

      recognition.lang = lang
      recognition.continuous = false      // s'arrête après une pause naturelle
      recognition.interimResults = true   // affiche le texte en cours de frappe
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setStatus('listening')
        setInterimText('')
        setErrorMessage(null)
      }

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }
        setInterimText(interim)
        if (final) {
          onFinalResult(final.trim())
          setInterimText('')
        }
      }

      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        const msgs: Record<string, string> = {
          'not-allowed': 'Accès au microphone refusé. Autorisez le micro dans les paramètres du navigateur.',
          'no-speech': 'Aucune parole détectée. Réessayez.',
          'network': 'Erreur réseau. Vérifiez votre connexion.',
          'audio-capture': 'Microphone introuvable ou inaccessible.',
          'aborted': '',
        }
        const msg = msgs[e.error] ?? `Erreur vocale: ${e.error}`
        if (msg) {
          setErrorMessage(msg)
          setStatus('error')
        }
      }

      recognition.onend = () => {
        setStatus('idle')
        setInterimText('')
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    },
    [isSupported, lang],
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus('idle')
    setInterimText('')
  }, [])

  return {
    isSupported,
    status,
    interimText,
    errorMessage,
    isListening: status === 'listening',
    startListening,
    stopListening,
  }
}
