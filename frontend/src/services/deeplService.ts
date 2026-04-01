// Service DeepL API pour traduction haute qualité
// DeepL offre une traduction bien meilleure que MyMemory (gratuit 500k caractères/mois)

const DEEPL_API_URL = 'https://api-free.deepl.com/v2';

interface DeepLTranslationResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

/**
 * Traduit un texte avec DeepL API
 * @param text Texte à traduire
 * @param targetLang Code langue cible (ex: 'EN', 'ES', 'DE')
 * @returns Texte traduit
 */
export async function translateWithDeepL(text: string, targetLang: string): Promise<string> {
  // Clé API DeepL depuis les variables d'environnement
  const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
  
  if (!apiKey) {
    console.warn('DeepL API key not found, falling back to original text');
    return text;
  }

  // Si français ou auto, retourner le texte original
  if (targetLang.toLowerCase() === 'fr' || targetLang.toLowerCase() === 'auto') {
    return text;
  }

  try {
    const response = await fetch(`${DEEPL_API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        target_lang: targetLang.toUpperCase(),
        source_lang: 'FR', // Source toujours français
        split_sentences: '1',
        preserve_formatting: '1',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepL API error:', error);
      return text; // Fallback
    }

    const data: DeepLTranslationResponse = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    }

    return text;
  } catch (error) {
    console.error('DeepL translation error:', error);
    return text; // En cas d'erreur, retourner le texte original
  }
}

/**
 * Détecte la langue d'un texte
 * @param text Texte à analyser
 * @returns Code langue détectée
 */
export async function detectLanguage(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
  
  if (!apiKey) {
    return 'FR';
  }

  try {
    const response = await fetch(`${DEEPL_API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text.substring(0, 100), // Prendre un échantillon
        target_lang: 'EN',
      }),
    });

    if (!response.ok) {
      return 'FR';
    }

    const data: DeepLTranslationResponse = await response.json();
    return data.translations?.[0]?.detected_source_language || 'FR';
  } catch {
    return 'FR';
  }
}

/**
 * Traduit un tableau de textes (batch) - plus efficace
 * @param texts Tableau de textes à traduire
 * @param targetLang Langue cible
 * @returns Tableau de textes traduits
 */
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const apiKey = import.meta.env.VITE_DEEPL_API_KEY;
  
  if (!apiKey || targetLang.toLowerCase() === 'fr' || targetLang.toLowerCase() === 'auto') {
    return texts;
  }

  try {
    const response = await fetch(`${DEEPL_API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        ...texts.reduce((acc, text, i) => ({ ...acc, [`text[${i}]`]: text }), {}),
        target_lang: targetLang.toUpperCase(),
        source_lang: 'FR',
      }),
    });

    if (!response.ok) {
      return texts;
    }

    const data: DeepLTranslationResponse = await response.json();
    return data.translations?.map(t => t.text) || texts;
  } catch (error) {
    console.error('DeepL batch translation error:', error);
    return texts;
  }
}
