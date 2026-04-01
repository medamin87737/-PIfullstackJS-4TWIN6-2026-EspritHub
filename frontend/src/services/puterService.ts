// Service de traduction avec fallback: Puter.js → MyMemory API
// Puter.js: LLM gratuit mais nécessite connexion
// MyMemory: API gratuite, fiable, pas de WebSocket

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options?: { model?: string }) => Promise<string>;
      };
    };
  }
}

const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

/**
 * Traduction fallback avec MyMemory API (100% gratuit, pas d'auth)
 */
async function translateWithMyMemory(text: string, targetLang: string): Promise<string> {
  try {
    const sourceLang = 'fr';
    const encodedText = encodeURIComponent(text);
    const url = `${MYMEMORY_API_URL}?q=${encodedText}&langpair=${sourceLang}|${targetLang}`;
    
    console.log('[MyMemory] Fallback translation...');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    return text;
  } catch (error) {
    console.error('[MyMemory] Error:', error);
    return text;
  }
}

/**
 * Vérifie si Puter.js est chargé
 * @returns true si disponible
 */
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.puter?.ai?.chat;
}

/**
 * Traduit un texte avec Puter.js AI (100% gratuit, illimité)
 * @param text Texte à traduire
 * @param targetLang Code langue cible (ex: 'en', 'es', 'de')
 * @returns Texte traduit
 */
export async function translateWithPuter(text: string, targetLang: string): Promise<string> {
  // Si français ou vide, retourner le texte original
  if (!text || targetLang.toLowerCase() === 'fr' || targetLang.toLowerCase() === 'auto') {
    return text;
  }

  // Vérifier si Puter est disponible
  if (!isPuterAvailable()) {
    console.warn('Puter.js not available, falling back to original text');
    return text;
  }

  // Limiter la taille pour éviter les timeouts (recommandé: 1000 chars max)
  const maxLength = 1000;
  const originalText = text;
  if (text.length > maxLength) {
    console.warn('Text too long for Puter.js, truncating to 1000 chars');
    text = text.substring(0, maxLength);
  }

  try {
    const prompt = `Translate the following text from French to ${getLanguageName(targetLang)}. Return ONLY the translated text, nothing else:

"${text}"`;

    console.log('[Puter.js] Sending translation request...');
    
    const result = await window.puter!.ai.chat(prompt, {
      model: 'gpt-4o-mini', // Modèle rapide et efficace pour la traduction
    });

    console.log('[Puter.js] Translation result:', result);

    // Nettoyer le résultat (enlever guillemets si présents)
    let translated = result?.toString().trim() || text;
    
    // Enlever les guillemets si le modèle les a ajoutés
    if (translated.startsWith('"') && translated.endsWith('"')) {
      translated = translated.slice(1, -1);
    }
    
    // Si le texte était tronqué, ajouter "..."
    if (originalText.length > maxLength && translated.length > 0) {
      translated = translated + '...';
    }

    return translated;
  } catch (error: any) {
    console.error('[Puter.js] Translation error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    // Fallback à MyMemory API si Puter.js échoue
    console.log('[Puter.js] Falling back to MyMemory API...');
    return translateWithMyMemory(originalText, targetLang);
  }
}

/**
 * Traduit un texte avec fallback
 * @param text Texte à traduire
 * @param targetLang Langue cible
 * @returns Texte traduit ou original si erreur
 */
export async function translateWithFallback(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang.toLowerCase() === 'fr') {
    return text;
  }

  try {
    return await translateWithPuter(text, targetLang);
  } catch {
    return text;
  }
}

/**
 * Traduit un tableau de textes (batch) en série
 * @param texts Tableau de textes à traduire
 * @param targetLang Langue cible
 * @returns Tableau de textes traduits
 */
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang.toLowerCase() === 'fr' || !isPuterAvailable()) {
    return texts;
  }

  const results: string[] = [];
  
  // Puter.js ne rate limite pas, mais on fait en série pour éviter les timeouts
  for (const text of texts) {
    try {
      const translated = await translateWithPuter(text, targetLang);
      results.push(translated);
    } catch {
      results.push(text);
    }
  }

  return results;
}

/**
 * Retourne le nom complet d'une langue
 * @param code Code langue
 * @returns Nom de la langue en anglais
 */
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'uk': 'Ukrainian',
    'he': 'Hebrew',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'el': 'Greek',
  };
  
  return languages[code.toLowerCase()] || code.toUpperCase();
}

export default {
  translate: translateWithPuter,
  translateBatch,
  isPuterAvailable,
  translateWithFallback,
};
