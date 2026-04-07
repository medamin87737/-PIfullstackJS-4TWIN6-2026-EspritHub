/**
 * Service d'intégration Google Calendar
 * 
 * Permet d'ajouter automatiquement les activités acceptées au calendrier Google de l'employé
 */

// Configuration Google OAuth2
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_CONFIGURED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

// Vérifier que les clés sont définies
if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
  console.error('❌ ERREUR: Les clés Google Calendar ne sont pas configurées!');
  console.error('Créez un fichier .env dans frontend/ avec:');
  console.error('VITE_GOOGLE_CLIENT_ID=votre-client-id');
  console.error('VITE_GOOGLE_API_KEY=votre-api-key');
} else {
  console.log('✅ Clés Google Calendar chargées');
}

// Charger l'API Google
let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: any = null;

/**
 * Initialise l'API Google Calendar
 */
export async function initGoogleCalendar(): Promise<void> {
  if (!GOOGLE_CONFIGURED) {
    throw new Error('Google Calendar is not configured');
  }
  return new Promise((resolve, reject) => {
    // Charger gapi (Google API)
    if (!gapiLoaded) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        gapiLoaded = true;
        (window as any).gapi.load('client', async () => {
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });
          checkBothLoaded();
        });
      };
      gapiScript.onerror = reject;
      document.head.appendChild(gapiScript);
    }

    // Charger gis (Google Identity Services)
    if (!gisLoaded) {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        gisLoaded = true;
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: '', // Sera défini lors de l'appel
        });
        checkBothLoaded();
      };
      gisScript.onerror = reject;
      document.head.appendChild(gisScript);
    }

    function checkBothLoaded() {
      if (gapiLoaded && gisLoaded) {
        resolve();
      }
    }

    // Si déjà chargés
    if (gapiLoaded && gisLoaded) {
      resolve();
    }
  });
}

/**
 * Vérifie si l'utilisateur est connecté à Google
 */
export function isGoogleConnected(): boolean {
  if (!GOOGLE_CONFIGURED) return false
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  
  if (!token || !expiry) return false;
  
  // Vérifier si le token n'est pas expiré
  return Date.now() < parseInt(expiry);
}

/**
 * Demande l'autorisation Google Calendar
 */
export async function requestGoogleAuth(): Promise<boolean> {
  try {
    if (!GOOGLE_CONFIGURED) {
      return false
    }
    // S'assurer que l'API est initialisée
    if (!gapiLoaded || !gisLoaded) {
      console.log('⏳ Initialisation de Google Calendar API...');
      await initGoogleCalendar();
    }

    // Attendre un peu pour s'assurer que tokenClient est créé
    let attempts = 0;
    while (!tokenClient && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!tokenClient) {
      console.error('❌ Token client not initialized after waiting');
      throw new Error('Impossible d\'initialiser le client Google. Vérifiez vos clés API.');
    }

    return new Promise((resolve) => {
      tokenClient.callback = (response: any) => {
        if (response.error) {
          console.error('Erreur d\'authentification Google:', response.error);
          resolve(false);
          return;
        }

        // Stocker le token
        localStorage.setItem('google_access_token', response.access_token);
        // Token expire dans 1 heure (3600 secondes)
        const expiry = Date.now() + (response.expires_in * 1000);
        localStorage.setItem('google_token_expiry', expiry.toString());

        // Configurer le token pour gapi
        (window as any).gapi.client.setToken({
          access_token: response.access_token,
        });

        console.log('✅ Authentification Google réussie');
        resolve(true);
      };

      // Vérifier si on a déjà un token valide
      if (isGoogleConnected()) {
        const token = localStorage.getItem('google_access_token');
        (window as any).gapi.client.setToken({
          access_token: token,
        });
        console.log('✅ Token Google existant utilisé');
        resolve(true);
      } else {
        // Demander un nouveau token
        console.log('🔐 Demande d\'autorisation Google...');
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la demande d\'autorisation:', error);
    return false;
  }
}

/**
 * Déconnecte l'utilisateur de Google
 */
export function disconnectGoogle(): void {
  const token = localStorage.getItem('google_access_token');
  if (token) {
    (window as any).google.accounts.oauth2.revoke(token);
  }
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
}

/**
 * Interface pour un événement d'activité
 */
export interface ActivityEvent {
  title: string;
  description: string;
  startDate: string; // ISO 8601 format
  endDate?: string;  // ISO 8601 format (optionnel)
  location?: string;
}

/**
 * Ajoute une activité au Google Calendar
 */
export async function addActivityToCalendar(activity: ActivityEvent): Promise<boolean> {
  try {
    if (!GOOGLE_CONFIGURED) {
      return false
    }
    // Vérifier que l'API est initialisée
    if (!gapiLoaded) {
      await initGoogleCalendar();
    }

    // Vérifier l'authentification
    if (!isGoogleConnected()) {
      const authorized = await requestGoogleAuth();
      if (!authorized) {
        throw new Error('Autorisation Google refusée');
      }
    }

    // Préparer l'événement
    const startDateTime = new Date(activity.startDate);
    const endDateTime = activity.endDate 
      ? new Date(activity.endDate)
      : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 heures par défaut

    const event = {
      summary: activity.title,
      description: activity.description,
      location: activity.location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 jour avant
          { method: 'popup', minutes: 30 },      // 30 minutes avant
        ],
      },
    };

    // Créer l'événement dans le calendrier
    const response = await (window as any).gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('✅ Événement créé dans Google Calendar:', response.result);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout au calendrier:', error);
    return false;
  }
}

/**
 * Obtient le statut de connexion Google
 */
export function getGoogleConnectionStatus(): {
  connected: boolean;
  email?: string;
} {
  const connected = isGoogleConnected();
  return {
    connected,
    email: connected ? localStorage.getItem('google_user_email') || undefined : undefined,
  };
}
