import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from 'react';
import { translateWithPuter } from '../services/puterService';
import { t as i18nTranslate, hasTranslation } from '../utils/i18n';

export type Language = 'auto' | 'en' | 'fr' | 'es' | 'de' | 'it';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  translatePage: () => Promise<void>;
  isTranslating: boolean;
  detectedLang: string;
  supportedLanguages: { code: string; name: string; flag: string }[];
}

const supportedLanguagesList = [
  { code: 'auto', name: 'Auto-détecter', flag: '🔍' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'mn', name: 'Монгол', flag: '🇲🇳' },
  { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
  { code: 'kk', name: 'Қазақ', flag: '🇰🇿' },
  { code: 'ky', name: 'Кыргызча', flag: '🇰🇬' },
  { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
  { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
];

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Cache pour les traductions
type TranslationCache = Record<string, Record<string, string>>;

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState('fr');
  const cacheRef = useRef<TranslationCache>({});
  const originalTextRef = useRef<Record<string, string>>({});

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
      document.documentElement.lang = lang === 'auto' ? 'auto' : lang;
      // Sauvegarder aussi l'heure de changement pour traçabilité
      localStorage.setItem('app_language_changed_at', new Date().toISOString());
    }
  }, []);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_language') as Language;
      const savedOriginals = localStorage.getItem('app_original_texts');
      
      if (saved && supportedLanguagesList.some(l => l.code === saved)) {
        setLanguageState(saved);
        document.documentElement.lang = saved === 'auto' ? 'auto' : saved;
      }
      
      // Restaurer les textes originaux sauvegardés
      if (savedOriginals) {
        try {
          originalTextRef.current = JSON.parse(savedOriginals);
        } catch {
          originalTextRef.current = {};
        }
      }
    }
  }, []);

  // Sauvegarder les textes originaux dans localStorage pour persistance
  const saveOriginalTextsToStorage = useCallback(() => {
    if (typeof window !== 'undefined' && Object.keys(originalTextRef.current).length > 0) {
      localStorage.setItem('app_original_texts', JSON.stringify(originalTextRef.current));
    }
  }, []);

  // Sauvegarder les textes originaux
  const saveOriginalTexts = useCallback(() => {
    if (typeof document === 'undefined') return;
    // Seulement les éléments marqués comme traduisibles et sûrs
    const elements = document.querySelectorAll('[data-translatable="true"]');
    elements.forEach((el, index) => {
      const key = `el_${index}`;
      if (!originalTextRef.current[key]) {
        originalTextRef.current[key] = el.textContent || '';
      }
    });
    // Sauvegarder dans localStorage pour persistance après logout
    saveOriginalTextsToStorage();
  }, [saveOriginalTextsToStorage]);

  // Fonction de traduction avec Puter.js AI (100% gratuit, illimité, LLM)
  const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (!text || text.trim() === '') return text;
    if (targetLang === 'auto' || targetLang === 'fr') return text;
    
    // Vérifier le cache d'abord
    if (cacheRef.current[targetLang]?.[text]) {
      return cacheRef.current[targetLang][text];
    }

    try {
      // Utiliser Puter.js AI (100% gratuit, pas de clé API, illimité)
      const translated = await translateWithPuter(text, targetLang);
      
      // Sauvegarder dans le cache si traduction réussie
      if (translated !== text) {
        if (!cacheRef.current[targetLang]) {
          cacheRef.current[targetLang] = {};
        }
        cacheRef.current[targetLang][text] = translated;
      }
      
      return translated;
    } catch (error) {
      console.error('Puter.js translation error:', error);
      return text; // Fallback: retourner le texte original
    }
  }, []);

// Fonction pour traduire la page entière - OPTIMISÉE
  const translatePage = useCallback(async () => {
    if (language === 'auto' || language === 'fr') {
      // Restaurer les textes originaux
      if (typeof document !== 'undefined') {
        const elements = document.querySelectorAll('[data-translatable="true"]');
        Object.entries(originalTextRef.current).forEach(([key, text]) => {
          const index = parseInt(key.replace('el_', ''));
          if (elements[index] && text) {
            elements[index].textContent = text;
          }
        });
      }
      return;
    }

    setIsTranslating(true);
    saveOriginalTexts();

    try {
      if (typeof document !== 'undefined') {
        const selectors = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'span', 'button:not([type="submit"])', 'a', 'label',
          'td', 'th', 'li', 'dt', 'dd',
          '[data-translatable="true"]'
        ];
        
        const elements = Array.from(document.querySelectorAll(selectors.join(', ')));
        
        // Filtrer et collecter les textes uniques
        const textMap = new Map<Element, string>();
        const uniqueTexts = new Set<string>();
        
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (!text || text.length === 0 || text.length > 200) continue;
          if (/^[\d\s\W]+$/.test(text)) continue; // Uniquement chiffres/symboles
          if (el.closest('script') || el.closest('style')) continue;
          
          // Ne PAS traduire les clés i18n (format: sidebar.hr.history)
          if (/^[a-z]+\.[a-z]+\.[a-z]+(\.[a-z]+)*$/.test(text)) continue;
          
          // Vérifier cache
          if (cacheRef.current[language]?.[text]) {
            el.textContent = cacheRef.current[language][text];
            continue;
          }
          
          textMap.set(el, text);
          uniqueTexts.add(text);
        }
        
        // Traduction en batch parallèle (max 5 simultanés)
        const textsArray = Array.from(uniqueTexts);
        const batchSize = 5;
        const results = new Map<string, string>();
        
        for (let i = 0; i < textsArray.length; i += batchSize) {
          const batch = textsArray.slice(i, i + batchSize);
          const batchPromises = batch.map(async (text) => {
            const translated = await translateText(text, language);
            results.set(text, translated);
            
            // Mettre à jour le cache
            if (!cacheRef.current[language]) {
              cacheRef.current[language] = {};
            }
            cacheRef.current[language][text] = translated;
            
            return translated;
          });
          
          await Promise.all(batchPromises);
          
          // Petit délai pour éviter le rate limiting
          if (i + batchSize < textsArray.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // Appliquer les traductions
        for (const [el, originalText] of textMap) {
          const translated = results.get(originalText);
          if (translated && translated !== originalText) {
            el.textContent = translated;
          }
        }
      }
    } catch (error) {
      console.error('Page translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [language, saveOriginalTexts, translateText]);

  // Fonction t() - utilise i18n pour les clés, API pour le contenu dynamique
  const t = useCallback((text: string): string => {
    const effectiveLang = language === 'auto' ? 'fr' : language;
    
    // DEBUG: Vérifier si c'est une clé i18n
    const isKey = hasTranslation(text);
    if (text.includes('sidebar') || text.includes('dashboard')) {
      console.log(`[t()] Key: ${text}, hasTranslation: ${isKey}, lang: ${effectiveLang}`);
    }
    
    // Si c'est une clé i18n connue, la traduire avec i18n
    if (isKey) {
      const translated = i18nTranslate(text, effectiveLang);
      console.log(`[t()] Translated ${text} -> ${translated}`);
      return translated;
    }
    
    // Si langue est FR ou AUTO, retourner le texte tel quel (pas de traduction API)
    if (language === 'auto' || language === 'fr') {
      return text;
    }
    
    // Pour le contenu dynamique (pas une clé i18n), vérifier le cache
    if (cacheRef.current[effectiveLang]?.[text]) {
      return cacheRef.current[effectiveLang][text];
    }
    
    // Contenu dynamique - traduction API en arrière-plan
    translateText(text, effectiveLang).then(translated => {
      if (translated !== text && typeof window !== 'undefined') {
        const event = new CustomEvent('translation-updated', { detail: { original: text, translated } });
        window.dispatchEvent(event);
      }
    });
    
    return text;
  }, [language, translateText]);

  // Écouter les changements de langue - DÉSACTIVÉ (trop lent)
  // NOTE: Utiliser t() pour les traductions i18n individuelles
  // La traduction de page complète est désactivée pour éviter les ralentissements
  /*
  useEffect(() => {
    if (language !== 'fr' && language !== 'auto') {
      translatePage();
    }
  }, [language, translatePage]);
  */

  // Réappliquer la traduction quand la page change (après connexion/navigation)
  // NOTE: Désactivé pour éviter les erreurs React DOM
  /*
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleRouteChange = () => {
      // Attendre que le DOM soit prêt
      setTimeout(() => {
        if (language !== 'fr' && language !== 'auto') {
          translatePage();
        }
      }, 500);
    };

    // Écouter les changements de route
    window.addEventListener('popstate', handleRouteChange);
    
    // Écouter un événement personnalisé pour la connexion réussie
    window.addEventListener('user-logged-in', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('user-logged-in', handleRouteChange);
    };
  }, [language, translatePage]);
  */

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translatePage,
        isTranslating,
        detectedLang,
        supportedLanguages: supportedLanguagesList,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}
