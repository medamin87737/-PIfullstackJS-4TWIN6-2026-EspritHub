import type { Language } from './context/AccessibilityContext'

type Messages = Record<string, string>

const fr: Messages = {
  // Generic
  'app.name': 'SkillUpTn',
  'app.tagline': 'Systeme intelligent de recommandation des employes',

  // Login hero
  'login.heroTitle': 'Systeme Intelligent de Recommandation des Employes',
  'login.heroBody':
    'Optimisez la gestion des competences et la recommandation des employes grace a l\'intelligence artificielle.',
  'login.heroPills': 'Recommandation • Analytics • Gestion des competences',

  // Header
  'header.searchPlaceholder': 'Rechercher...',
  'header.notifications': 'Notifications',
  'header.noNotifications': 'Aucune notification',

  // Sidebar common
  'sidebar.logoSubtitle': 'Recommendation System',

  // Sidebar ADMIN
  'sidebar.admin.dashboard': 'Dashboard',
  'sidebar.admin.users': 'Utilisateurs',
  'sidebar.admin.departments': 'Departements',
  'sidebar.admin.skills': 'Competences',
  'sidebar.admin.questions': 'Questions',
  'sidebar.admin.analytics': 'Analytiques',
  'sidebar.admin.promptRewriter': 'Reformulation',

  // Sidebar HR
  'sidebar.hr.dashboard': 'Dashboard',
  'sidebar.hr.activities': 'Activites',
  'sidebar.hr.createActivity': 'Creer Activite',
  'sidebar.hr.history': 'Historique',
  'sidebar.hr.analytics': 'Analytiques',
  'sidebar.hr.promptRewriter': 'Reformulation',

  // Sidebar MANAGER
  'sidebar.manager.dashboard': 'Dashboard',
  'sidebar.manager.activities': 'Activites',
  'sidebar.manager.validations': 'Validations',
  'sidebar.manager.history': 'Historique',

  // Sidebar EMPLOYEE
  'sidebar.employee.dashboard': 'Dashboard',
  'sidebar.employee.activities': 'Mes Activites',
  'sidebar.employee.notifications': 'Notifications',
  'sidebar.employee.history': 'Historique',
  'sidebar.employee.profile': 'Mon Profil',

  // Dashboards
  'dashboard.admin.title': 'Dashboard Administrateur',
  'dashboard.admin.subtitle': 'Vue globale du systeme de recommandation',
  'dashboard.admin.card.totalEmployees': 'Total Employes',
  'dashboard.admin.card.departments': 'Departements',
  'dashboard.admin.card.activities': 'Activites',
  'dashboard.admin.card.evaluatedSkills': 'Competences evaluees',
  'dashboard.admin.section.skillsByDepartment': 'Competences par departement',
  'dashboard.admin.section.roleDistribution': 'Repartition des roles',
  'dashboard.admin.section.globalProgression': 'Progression globale des competences',

  'dashboard.hr.title': 'Dashboard RH',
  'dashboard.hr.subtitle': 'Gerez les activites et les recommandations',
  'dashboard.hr.card.openActivities': 'Activites ouvertes',
  'dashboard.hr.card.recommendedEmployees': 'Employes recommandes',
  'dashboard.hr.card.confirmations': 'Confirmations',
  'dashboard.hr.card.notifications': 'Notifications',
  'dashboard.hr.section.recentActivities': 'Activites recentes',
  'dashboard.hr.section.viewAll': 'Voir tout',

  'dashboard.manager.title': 'Dashboard Manager',
  'dashboard.manager.subtitle': 'Gerez votre equipe et validez les participations',
  'dashboard.manager.card.myActivities': 'Mes activites',
  'dashboard.manager.card.pendingValidations': 'Validations en attente',
  'dashboard.manager.card.myTeam': 'Mon equipe',
  'dashboard.manager.card.notifications': 'Notifications',
  'dashboard.manager.section.myTeam': 'Mon equipe',
  'dashboard.manager.section.noTeam': 'Aucun membre dans l\'equipe',
  'dashboard.manager.section.assignedActivities': 'Activites assignees',
  'dashboard.manager.section.noAssignedActivities': 'Aucune activite assignee',
  'dashboard.manager.section.viewAll': 'Voir tout',

  'dashboard.employee.title': 'Mon Espace',
  'dashboard.employee.subtitle': 'Bienvenue,',
  'dashboard.employee.card.proposedActivities': 'Activites proposees',
  'dashboard.employee.card.participations': 'Participations',
  'dashboard.employee.card.pending': 'En attente',
  'dashboard.employee.card.notifications': 'Notifications',
  'dashboard.employee.section.mySkills': 'Mes competences',
  'dashboard.employee.section.noSkills': 'Aucune competence evaluee',
  'dashboard.employee.section.progression': 'Ma progression',
  'dashboard.employee.section.recentNotifications': 'Notifications recentes',
  'dashboard.employee.section.noNotifications': 'Aucune notification',
  'dashboard.employee.section.viewAll': 'Voir tout',

  // Login page
  'login.title': 'Connexion',
  'login.subtitle': 'Accedez a votre espace de travail',
  'login.email': 'Email',
  'login.emailPlaceholder': 'votre.email@skillup.tn',
  'login.password': 'Mot de passe',
  'login.passwordPlaceholder': 'Votre mot de passe',
  'login.submit': 'Se connecter',
  'login.errorMissingEmail': 'Veuillez saisir votre email',
  'login.errorMissingPassword': 'Veuillez saisir votre mot de passe',
  'login.errorLogin': 'Email ou mot de passe incorrect',
  'login.errorRole': 'Impossible de determiner votre role utilisateur',
}

const en: Messages = {
  // Generic
  'app.name': 'SkillUpTn',
  'app.tagline': 'Intelligent Employee Recommendation System',

  // Login hero
  'login.heroTitle': 'Intelligent Employee Recommendation System',
  'login.heroBody':
    'Optimize skills management and employee recommendations powered by artificial intelligence.',
  'login.heroPills': 'Recommendation • Analytics • Skills management',

  // Header
  'header.searchPlaceholder': 'Search...',
  'header.notifications': 'Notifications',
  'header.noNotifications': 'No notifications',

  // Sidebar common
  'sidebar.logoSubtitle': 'Recommendation System',

  // Sidebar ADMIN
  'sidebar.admin.dashboard': 'Dashboard',
  'sidebar.admin.users': 'Users',
  'sidebar.admin.departments': 'Departments',
  'sidebar.admin.skills': 'Skills',
  'sidebar.admin.questions': 'Questions',
  'sidebar.admin.analytics': 'Analytics',
  'sidebar.admin.promptRewriter': 'Prompt rewrite',

  // Sidebar HR
  'sidebar.hr.dashboard': 'Dashboard',
  'sidebar.hr.activities': 'Activities',
  'sidebar.hr.createActivity': 'Create Activity',
  'sidebar.hr.history': 'History',
  'sidebar.hr.analytics': 'Analytics',
  'sidebar.hr.promptRewriter': 'Prompt rewrite',

  // Sidebar MANAGER
  'sidebar.manager.dashboard': 'Dashboard',
  'sidebar.manager.activities': 'Activities',
  'sidebar.manager.validations': 'Approvals',
  'sidebar.manager.history': 'History',

  // Sidebar EMPLOYEE
  'sidebar.employee.dashboard': 'Dashboard',
  'sidebar.employee.activities': 'My Activities',
  'sidebar.employee.notifications': 'Notifications',
  'sidebar.employee.history': 'History',
  'sidebar.employee.profile': 'My Profile',

  // Login page
  'login.title': 'Sign in',
  'login.subtitle': 'Access your workspace',
  'login.email': 'Email',
  'login.emailPlaceholder': 'your.email@skillup.tn',
  'login.password': 'Password',
  'login.passwordPlaceholder': 'Your password',
  'login.submit': 'Sign in',
  'login.errorMissingEmail': 'Please enter your email',
  'login.errorMissingPassword': 'Please enter your password',
  'login.errorLogin': 'Incorrect email or password',
  'login.errorRole': 'Unable to determine your user role',

  // Dashboards
  'dashboard.admin.title': 'Admin Dashboard',
  'dashboard.admin.subtitle': 'Global view of the recommendation system',
  'dashboard.admin.card.totalEmployees': 'Total Employees',
  'dashboard.admin.card.departments': 'Departments',
  'dashboard.admin.card.activities': 'Activities',
  'dashboard.admin.card.evaluatedSkills': 'Evaluated skills',
  'dashboard.admin.section.skillsByDepartment': 'Skills by department',
  'dashboard.admin.section.roleDistribution': 'Role distribution',
  'dashboard.admin.section.globalProgression': 'Global skills progression',

  'dashboard.hr.title': 'HR Dashboard',
  'dashboard.hr.subtitle': 'Manage activities and recommendations',
  'dashboard.hr.card.openActivities': 'Open activities',
  'dashboard.hr.card.recommendedEmployees': 'Recommended employees',
  'dashboard.hr.card.confirmations': 'Confirmations',
  'dashboard.hr.card.notifications': 'Notifications',
  'dashboard.hr.section.recentActivities': 'Recent activities',
  'dashboard.hr.section.viewAll': 'View all',

  'dashboard.manager.title': 'Manager Dashboard',
  'dashboard.manager.subtitle': 'Manage your team and validate participations',
  'dashboard.manager.card.myActivities': 'My activities',
  'dashboard.manager.card.pendingValidations': 'Pending validations',
  'dashboard.manager.card.myTeam': 'My team',
  'dashboard.manager.card.notifications': 'Notifications',
  'dashboard.manager.section.myTeam': 'My team',
  'dashboard.manager.section.noTeam': 'No team members',
  'dashboard.manager.section.assignedActivities': 'Assigned activities',
  'dashboard.manager.section.noAssignedActivities': 'No assigned activities',
  'dashboard.manager.section.viewAll': 'View all',

  'dashboard.employee.title': 'My Space',
  'dashboard.employee.subtitle': 'Welcome,',
  'dashboard.employee.card.proposedActivities': 'Proposed activities',
  'dashboard.employee.card.participations': 'Participations',
  'dashboard.employee.card.pending': 'Pending',
  'dashboard.employee.card.notifications': 'Notifications',
  'dashboard.employee.section.mySkills': 'My skills',
  'dashboard.employee.section.noSkills': 'No evaluated skills',
  'dashboard.employee.section.progression': 'My progression',
  'dashboard.employee.section.recentNotifications': 'Recent notifications',
  'dashboard.employee.section.noNotifications': 'No notifications',
  'dashboard.employee.section.viewAll': 'View all',
}

const messages: Record<Language, Messages> = { fr, en }

export function t(lang: Language, key: string): string {
  return messages[lang]?.[key] ?? messages.fr[key] ?? key
}

