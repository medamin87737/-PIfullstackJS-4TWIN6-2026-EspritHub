import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from 'react';

export type Language = 
  | 'auto' | 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'tr' | 'nl' | 'pl' | 'sv' | 'da' | 'no' | 'fi' | 'cs' | 'hu' | 'ro' | 'bg' | 'hr' | 'sr' | 'uk' | 'he' | 'th' | 'vi' | 'id' | 'ms' | 'tl' | 'sw' | 'ta' | 'te' | 'mr' | 'bn' | 'ur' | 'fa' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'ne' | 'si' | 'my' | 'km' | 'lo' | 'mn' | 'uz' | 'kk' | 'ky' | 'tg' | 'az' | 'ka' | 'hy' | 'eu' | 'ca' | 'gl' | 'sq' | 'be' | 'is' | 'ga' | 'cy' | 'gd' | 'lb' | 'mt' | 'mi' | 'sm' | 'haw' | 'ht' | 'jw' | 'su' | 'mg' | 'ny' | 'sn' | 'yo' | 'ig' | 'ha' | 'am' | 'so' | 'af' | 'st' | 'xh' | 'zu' | 'rw' | 'ln' | 'kg' | 'wo' | 'ba' | 'tt' | 'kv' | 'cv' | 'udm' | 'mhr' | 'sah' | 'tyv' | 'xal' | 'krc' | 'ce' | 'ab' | 'os' | 'roa' | 'ia' | 'eo' | 'vo' | 'ie' | 'kw' | 'br' | 'co' | 'nds' | 'pdc' | 'de_at' | 'gsw' | 'bar' | 'frr' | 'stq' | 'li' | 'nl_be' | 'af' | 'wa' | 'pcd' | 'fr_ca' | 'fr_ch' | 'rm' | 'fur' | 'lld' | 'sc' | 'scn' | 'vec' | 'nap' | 'lij' | 'eml' | 'lmo' | 'rgn' | 'wa' | 'pms' | 'lzh' | 'zh_classical' | 'zh_min_nan' | 'zh_yue' | 'cdo' | 'gan' | 'hak' | 'wuu' | 'hsn' | 'czh' | 'cpx' | 'nan' | 'mnp' | 'cmn' | 'zh' | 'yue' | 'gan' | 'hsn' | 'czh' | 'cpx' | 'mnp' | 'nan' | 'wuu' | 'hak' | 'cdo' | 'lzh' | 'zh_classical' | 'zh_min_nan';

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

  // Fonction de traduction avec API MyMemory (gratuit)
  const translateText = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (!text || text.trim() === '') return text;
    if (targetLang === 'auto' || targetLang === 'fr') return text;
    
    // Vérifier le cache
    if (cacheRef.current[targetLang]?.[text]) {
      return cacheRef.current[targetLang][text];
    }

    try {
      // Utiliser MyMemory API (gratuit, 1000 mots/jour)
      const encodedText = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=fr|${targetLang}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        
        // Sauvegarder dans le cache
        if (!cacheRef.current[targetLang]) {
          cacheRef.current[targetLang] = {};
        }
        cacheRef.current[targetLang][text] = translated;
        
        return translated;
      }
      
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, []);

  // Fonction pour traduire la page entière
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
        // Seulement les éléments explicitement marqués comme traduisibles
        const elements = document.querySelectorAll('[data-translatable="true"]');
        
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const originalText = originalTextRef.current[`el_${i}`] || el.textContent || '';
          
          if (originalText && originalText.trim().length > 0 && originalText.trim().length < 500) {
            const translated = await translateText(originalText, language);
            if (translated !== originalText) {
              el.textContent = translated;
            }
          }
        }
      }
    } catch (error) {
      console.error('Page translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [language, saveOriginalTexts, translateText]);

  // Fonction t() pour traduire un texte spécifique
  const t = useCallback((text: string): string => {
    if (language === 'auto' || language === 'fr') return text;
    
    // Vérifier le cache d'abord
    if (cacheRef.current[language]?.[text]) {
      return cacheRef.current[language][text];
    }
    
    // Traduction asynchrone en arrière-plan
    translateText(text, language).then(translated => {
      if (translated !== text && typeof window !== 'undefined') {
        // Forcer la mise à jour si nécessaire
        const event = new CustomEvent('translation-updated', { detail: { original: text, translated } });
        window.dispatchEvent(event);
      }
    });
    
    return text;
  }, [language, translateText]);

  // Écouter les changements de langue pour traduire automatiquement
  // NOTE: Désactivé pour éviter les erreurs DOM - utiliser translatePage() manuellement
  // ou marquer les éléments avec data-translatable="true"
  /*
  useEffect(() => {
    translatePage();
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
