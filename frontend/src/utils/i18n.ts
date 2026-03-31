// Système i18n - Traductions prédéfinies pour l'interface
// Pas d'API translation ici, juste des lookups rapides

export type Language = 'fr' | 'en' | 'es' | 'de' | 'it' | 'auto';

interface Translations {
  [key: string]: {
    [lang: string]: string;
  };
}

const translations: Translations = {
  // Sidebar HR
  'sidebar.hr.dashboard': {
    fr: 'Dashboard',
    en: 'Dashboard',
    es: 'Panel',
    de: 'Übersicht',
    it: 'Cruscotto',
  },
  'sidebar.hr.activities': {
    fr: 'Activités',
    en: 'Activities',
    es: 'Actividades',
    de: 'Aktivitäten',
    it: 'Attività',
  },
  'sidebar.hr.history': {
    fr: 'Historique',
    en: 'History',
    es: 'Historial',
    de: 'Verlauf',
    it: 'Storia',
  },
  'sidebar.hr.analytics': {
    fr: 'Analytiques',
    en: 'Analytics',
    es: 'Analíticas',
    de: 'Analytik',
    it: 'Analitiche',
  },
  'sidebar.hr.promptRewriter': {
    fr: 'Reformulation',
    en: 'Prompt Rewriter',
    es: 'Reformulación',
    de: 'Umformulierung',
    it: 'Riformulazione',
  },
  'sidebar.hr.importEmployees': {
    fr: 'Import CSV Employés',
    en: 'Import CSV Employees',
    es: 'Importar CSV Empleados',
    de: 'CSV Mitarbeiter importieren',
    it: 'Importa CSV Dipendenti',
  },
  'sidebar.hr.activityRequests': {
    fr: 'Demandes Managers',
    en: 'Manager Requests',
    es: 'Solicitudes Manager',
    de: 'Manager-Anfragen',
    it: 'Richieste Manager',
  },
  'sidebar.hr.createActivity': {
    fr: 'Créer Activité',
    en: 'Create Activity',
    es: 'Crear Actividad',
    de: 'Aktivität erstellen',
    it: 'Crea Attività',
  },
  
  // Sidebar Admin
  'sidebar.admin.dashboard': {
    fr: 'Dashboard',
    en: 'Dashboard',
    es: 'Panel',
    de: 'Übersicht',
    it: 'Cruscotto',
  },
  'sidebar.admin.users': {
    fr: 'Utilisateurs',
    en: 'Users',
    es: 'Usuarios',
    de: 'Benutzer',
    it: 'Utenti',
  },
  'sidebar.admin.departments': {
    fr: 'Départements',
    en: 'Departments',
    es: 'Departamentos',
    de: 'Abteilungen',
    it: 'Dipartimenti',
  },
  'sidebar.admin.skills': {
    fr: 'Compétences',
    en: 'Skills',
    es: 'Habilidades',
    de: 'Fähigkeiten',
    it: 'Competenze',
  },
  'sidebar.admin.questions': {
    fr: 'Questions',
    en: 'Questions',
    es: 'Preguntas',
    de: 'Fragen',
    it: 'Domande',
  },
  'sidebar.admin.analytics': {
    fr: 'Analytiques',
    en: 'Analytics',
    es: 'Analíticas',
    de: 'Analytik',
    it: 'Analitiche',
  },
  'sidebar.admin.promptRewriter': {
    fr: 'Reformulation',
    en: 'Prompt Rewriter',
    es: 'Reformulación',
    de: 'Umformulierung',
    it: 'Riformulazione',
  },
  
  // Sidebar Manager
  'sidebar.manager.dashboard': {
    fr: 'Dashboard',
    en: 'Dashboard',
    es: 'Panel',
    de: 'Übersicht',
    it: 'Cruscotto',
  },
  'sidebar.manager.activities': {
    fr: 'Activités',
    en: 'Activities',
    es: 'Actividades',
    de: 'Aktivitäten',
    it: 'Attività',
  },
  'sidebar.manager.validations': {
    fr: 'Validations',
    en: 'Validations',
    es: 'Validaciones',
    de: 'Validierungen',
    it: 'Validazioni',
  },
  'sidebar.manager.history': {
    fr: 'Historique',
    en: 'History',
    es: 'Historial',
    de: 'Verlauf',
    it: 'Storia',
  },
  
  // Sidebar Employee
  'sidebar.employee.dashboard': {
    fr: 'Dashboard',
    en: 'Dashboard',
    es: 'Panel',
    de: 'Übersicht',
    it: 'Cruscotto',
  },
  'sidebar.employee.activities': {
    fr: 'Mes Activités',
    en: 'My Activities',
    es: 'Mis Actividades',
    de: 'Meine Aktivitäten',
    it: 'Le mie Attività',
  },
  'sidebar.employee.notifications': {
    fr: 'Notifications',
    en: 'Notifications',
    es: 'Notificaciones',
    de: 'Benachrichtigungen',
    it: 'Notifiche',
  },
  'sidebar.employee.history': {
    fr: 'Historique',
    en: 'History',
    es: 'Historial',
    de: 'Verlauf',
    it: 'Storia',
  },
  'sidebar.employee.profile': {
    fr: 'Mon Profil',
    en: 'My Profile',
    es: 'Mi Perfil',
    de: 'Mein Profil',
    it: 'Il mio Profilo',
  },
  
  // Dashboard HR titles
  'dashboard.hr.title': {
    fr: 'Espace RH',
    en: 'HR Workspace',
    es: 'Espacio RRHH',
    de: 'HR Arbeitsbereich',
    it: 'Spazio Risorse Umane',
  },
  'dashboard.hr.subtitle': {
    fr: 'Gérez vos activités et recommandations',
    en: 'Manage your activities and recommendations',
    es: 'Gestiona tus actividades y recomendaciones',
    de: 'Verwalten Sie Ihre Aktivitäten und Empfehlungen',
    it: 'Gestisci le tue attività e raccomandazioni',
  },
  
  // Dashboard cards
  'dashboard.hr.card.openActivities': {
    fr: 'Activités ouvertes',
    en: 'Open Activities',
    es: 'Actividades abiertas',
    de: 'Offene Aktivitäten',
    it: 'Attività aperte',
  },
  'dashboard.hr.card.recommendedEmployees': {
    fr: 'Employés recommandés',
    en: 'Recommended Employees',
    es: 'Empleados recomendados',
    de: 'Empfohlene Mitarbeiter',
    it: 'Dipendenti consigliati',
  },
  'dashboard.hr.card.confirmations': {
    fr: 'Confirmations',
    en: 'Confirmations',
    es: 'Confirmaciones',
    de: 'Bestätigungen',
    it: 'Conferme',
  },
  'dashboard.hr.card.notifications': {
    fr: 'Notifications',
    en: 'Notifications',
    es: 'Notificaciones',
    de: 'Benachrichtigungen',
    it: 'Notifiche',
  },
  
  // Sections
  'dashboard.hr.section.recentActivities': {
    fr: 'Activités récentes',
    en: 'Recent Activities',
    es: 'Actividades recientes',
    de: 'Kürzliche Aktivitäten',
    it: 'Attività recenti',
  },
  'dashboard.hr.section.viewAll': {
    fr: 'Voir tout',
    en: 'View all',
    es: 'Ver todo',
    de: 'Alle anzeigen',
    it: 'Vedi tutto',
  },
  
  // Common
  'common.newActivity': {
    fr: 'Nouvelle activité',
    en: 'New Activity',
    es: 'Nueva actividad',
    de: 'Neue Aktivität',
    it: 'Nuova attività',
  },
  'common.recommendations': {
    fr: 'Recommandations',
    en: 'Recommendations',
    es: 'Recomendaciones',
    de: 'Empfehlungen',
    it: 'Raccomandazioni',
  },
  'common.loading': {
    fr: 'Chargement...',
    en: 'Loading...',
    es: 'Cargando...',
    de: 'Laden...',
    it: 'Caricamento...',
  },
};

/**
 * Traduit une clé i18n en texte dans la langue demandée
 * @param key Clé i18n (ex: 'sidebar.hr.dashboard')
 * @param lang Code langue (fr, en, es, de, it)
 * @returns Texte traduit ou la clé si non trouvée
 */
export function t(key: string, lang: Language = 'fr'): string {
  if (lang === 'auto' || lang === 'fr') {
    // Retourner le français si dispo, sinon la clé
    return translations[key]?.fr || key;
  }
  
  const translation = translations[key];
  if (!translation) return key; // Clé non trouvée, retourner la clé
  
  return translation[lang] || translation['en'] || translation['fr'] || key;
}

/**
 * Vérifie si une clé existe dans les traductions
 */
export function hasTranslation(key: string): boolean {
  return key in translations;
}

/**
 * Retourne toutes les langues supportées
 */
export function getSupportedLanguages(): { code: Language; name: string }[] {
  return [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
  ];
}

export default {
  t,
  hasTranslation,
  getSupportedLanguages,
};
