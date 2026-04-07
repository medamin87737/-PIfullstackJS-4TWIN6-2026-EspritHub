import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

export type Language = string

const supportedLanguagesList = [
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'ar', name: 'العربية',    flag: '🇸🇦' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'pt', name: 'Português',  flag: '🇵🇹' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷' },
  { code: 'tr', name: 'Türkçe',     flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski',     flag: '🇵🇱' },
]

interface TranslationContextType {
  language: Language
  setLanguage: (lang: Language) => void
  translatePage: () => Promise<void>
  isTranslating: boolean
  supportedLanguages: typeof supportedLanguagesList
  t: (text: string) => string
  detectedLang: string
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

// Google Translate API non officielle — gratuite, sans clé, sans limite
async function googleTranslate(text: string, targetLang: string): Promise<string> {
  if (!text.trim() || targetLang === 'fr') return text
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    // La réponse est un tableau imbriqué : data[0] contient les segments traduits
    const translated = (data[0] as any[][])
      ?.map((seg: any[]) => seg[0])
      .filter(Boolean)
      .join('')
    return translated || text
  } catch {
    return text
  }
}

// Collecte tous les nœuds texte visibles du DOM
function collectTextNodes(root: Element): Text[] {
  const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'code', 'pre', 'input', 'textarea', 'select', 'option'])
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (SKIP_TAGS.has(parent.tagName.toLowerCase())) return NodeFilter.FILTER_REJECT
      const text = (node.textContent ?? '').trim()
      if (text.length < 2) return NodeFilter.FILTER_REJECT
      // Ignorer chiffres purs, URLs, codes
      if (/^[\d\s.,:%€$+\-/()°#@!?]+$/.test(text)) return NodeFilter.FILTER_REJECT
      if (/^https?:\/\//.test(text)) return NodeFilter.FILTER_REJECT
      if (/^[A-Z_]{3,}$/.test(text)) return NodeFilter.FILTER_REJECT // constantes
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  return nodes
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')
  const [isTranslating, setIsTranslating] = useState(false)
  const originalsRef = useRef<Map<Text, string>>(new Map())
  const currentLangRef = useRef<Language>('fr')

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    currentLangRef.current = lang
  }, [])

  const translatePage = useCallback(async () => {
    const lang = currentLangRef.current

    // Retour au français → restaurer les originaux
    if (lang === 'fr') {
      originalsRef.current.forEach((original, node) => {
        if (node.isConnected) node.textContent = original
      })
      originalsRef.current.clear()
      return
    }

    setIsTranslating(true)
    try {
      const root = document.getElementById('root') ?? document.body
      const nodes = collectTextNodes(root)

      // Sauvegarder les originaux et dédupliquer
      const uniqueMap = new Map<string, string>() // original → translated
      const nodeOriginals: Array<{ node: Text; original: string }> = []

      for (const node of nodes) {
        const original = originalsRef.current.get(node) ?? (node.textContent?.trim() ?? '')
        if (!original) continue
        if (!originalsRef.current.has(node)) originalsRef.current.set(node, original)
        nodeOriginals.push({ node, original })
        if (!uniqueMap.has(original)) uniqueMap.set(original, original)
      }

      // Traduire les textes uniques en batch de 10
      const entries = Array.from(uniqueMap.keys())
      const BATCH = 10
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries.slice(i, i + BATCH)
        await Promise.all(
          batch.map(async (text) => {
            const translated = await googleTranslate(text, lang)
            uniqueMap.set(text, translated)
          }),
        )
        // Appliquer au fur et à mesure pour un effet progressif
        for (const { node, original } of nodeOriginals) {
          if (!node.isConnected) continue
          const translated = uniqueMap.get(original)
          if (translated && translated !== original) node.textContent = translated
        }
        if (i + BATCH < entries.length) await new Promise(r => setTimeout(r, 50))
      }
    } finally {
      setIsTranslating(false)
    }
  }, [])

  const t = useCallback((text: string) => text, [])

  return (
    <TranslationContext.Provider value={{
      language, setLanguage, translatePage, isTranslating,
      supportedLanguages: supportedLanguagesList,
      t, detectedLang: 'fr',
    }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(TranslationContext)
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider')
  return ctx
}
