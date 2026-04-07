# 📅 Configuration Google Calendar API

## Vue d'ensemble

Ce guide explique comment configurer l'intégration Google Calendar pour permettre aux employés d'ajouter automatiquement les activités acceptées à leur calendrier Google.

## 🔑 Obtenir les clés API Google

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur "Sélectionner un projet" en haut
3. Cliquez sur "Nouveau projet"
4. Donnez un nom à votre projet (ex: "HR Recommendation System")
5. Cliquez sur "Créer"

### 2. Activer l'API Google Calendar

1. Dans le menu de gauche, allez dans "APIs & Services" > "Library"
2. Recherchez "Google Calendar API"
3. Cliquez sur "Google Calendar API"
4. Cliquez sur "Activer"

### 3. Créer des identifiants OAuth 2.0

#### A. Configurer l'écran de consentement OAuth

1. Allez dans "APIs & Services" > "OAuth consent screen"
2. Sélectionnez "External" (ou "Internal" si vous avez Google Workspace)
3. Cliquez sur "Créer"
4. Remplissez les informations:
   - **Nom de l'application**: HR Recommendation System
   - **Email d'assistance utilisateur**: votre email
   - **Logo de l'application**: (optionnel)
   - **Domaine de l'application**: votre domaine (ex: localhost:5173 pour dev)
   - **Domaines autorisés**: ajoutez votre domaine
   - **Email du développeur**: votre email
5. Cliquez sur "Enregistrer et continuer"
6. **Scopes**: Cliquez sur "Add or Remove Scopes"
   - Recherchez et ajoutez: `https://www.googleapis.com/auth/calendar.events`
   - Cliquez sur "Update"
7. Cliquez sur "Enregistrer et continuer"
8. **Utilisateurs de test** (si External):
   - Ajoutez les emails des utilisateurs qui pourront tester
   - Cliquez sur "Enregistrer et continuer"
9. Cliquez sur "Retour au tableau de bord"

#### B. Créer l'ID client OAuth 2.0

1. Allez dans "APIs & Services" > "Credentials"
2. Cliquez sur "+ Create Credentials" > "OAuth client ID"
3. Type d'application: **Application Web**
4. Nom: "HR Recommendation Web Client"
5. **Origines JavaScript autorisées**:
   - Pour développement: `http://localhost:5173`
   - Pour production: `https://votre-domaine.com`
6. **URI de redirection autorisés**:
   - Pour développement: `http://localhost:5173`
   - Pour production: `https://votre-domaine.com`
7. Cliquez sur "Créer"
8. **Copiez l'ID client** (format: `xxxxx.apps.googleusercontent.com`)

### 4. Créer une clé API

1. Toujours dans "APIs & Services" > "Credentials"
2. Cliquez sur "+ Create Credentials" > "API key"
3. **Copiez la clé API**
4. (Optionnel) Cliquez sur "Restreindre la clé":
   - Restrictions d'API: Sélectionnez "Google Calendar API"
   - Restrictions d'application: Sélectionnez "Référents HTTP"
   - Ajoutez: `http://localhost:5173/*` et `https://votre-domaine.com/*`
5. Cliquez sur "Enregistrer"

## ⚙️ Configuration de l'application

### 1. Créer le fichier .env

Dans le dossier `frontend/`, créez un fichier `.env`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=votre-api-key
```

**Remplacez** `votre-client-id` et `votre-api-key` par vos vraies clés.

### 2. Redémarrer le serveur de développement

```bash
cd frontend
npm run dev
```

## 🧪 Tester l'intégration

### 1. Se connecter en tant qu'employé

1. Ouvrez `http://localhost:5173`
2. Connectez-vous avec un compte employé
3. Allez sur "Mes activités"

### 2. Connecter Google Calendar

1. Vous verrez un bouton **"📅 Connecter Google Calendar"**
2. Cliquez dessus
3. Une popup Google s'ouvrira
4. Sélectionnez votre compte Google
5. Autorisez l'accès au calendrier
6. Le bouton devrait afficher **"✓ Connecté à Google Calendar"**

### 3. Accepter une activité

1. Cliquez sur **"Accepter"** pour une activité
2. L'activité devrait être ajoutée à votre calendrier Google
3. Vous verrez un toast: **"Activité ajoutée à votre calendrier Google ✓"**

### 4. Vérifier dans Google Calendar

1. Ouvrez [Google Calendar](https://calendar.google.com/)
2. Vous devriez voir l'événement créé avec:
   - Titre de l'activité
   - Description
   - Date/heure
   - Rappels (1 jour avant + 30 minutes avant)

## 🔒 Sécurité

### Tokens d'accès

- Les tokens sont stockés dans `localStorage`
- Ils expirent après 1 heure
- L'utilisateur devra se reconnecter après expiration

### Permissions

L'application demande uniquement:
- `calendar.events`: Créer/modifier des événements
- Pas d'accès en lecture aux événements existants
- Pas d'accès aux autres services Google

### Déconnexion

L'utilisateur peut se déconnecter à tout moment:
1. Cliquez sur **"Déconnecter"** à côté de "✓ Connecté à Google Calendar"
2. Le token sera révoqué
3. Les événements déjà créés restent dans le calendrier

## 🐛 Résolution de problèmes

### Erreur: "Autorisation refusée"

**Cause**: L'utilisateur a refusé l'autorisation ou annulé la popup

**Solution**: Cliquez à nouveau sur "Connecter Google Calendar"

### Erreur: "Impossible de charger l'API Google Calendar"

**Causes possibles**:
1. Clés API incorrectes dans `.env`
2. API Google Calendar non activée
3. Problème de connexion internet

**Solutions**:
1. Vérifiez vos clés dans `.env`
2. Vérifiez que l'API est activée dans Google Cloud Console
3. Rechargez la page

### Erreur: "redirect_uri_mismatch"

**Cause**: L'URI de redirection n'est pas autorisée

**Solution**:
1. Allez dans Google Cloud Console > Credentials
2. Modifiez votre OAuth client ID
3. Ajoutez `http://localhost:5173` dans "Origines JavaScript autorisées"
4. Ajoutez `http://localhost:5173` dans "URI de redirection autorisés"
5. Enregistrez

### L'événement n'apparaît pas dans le calendrier

**Causes possibles**:
1. L'activité n'a pas de date de début
2. Token expiré
3. Erreur réseau

**Solutions**:
1. Vérifiez que l'activité a une date
2. Déconnectez et reconnectez Google Calendar
3. Consultez la console (F12) pour voir les erreurs

### Erreur: "API key not valid"

**Cause**: La clé API est incorrecte ou restreinte

**Solution**:
1. Vérifiez la clé dans `.env`
2. Dans Google Cloud Console, vérifiez que la clé n'est pas trop restreinte
3. Créez une nouvelle clé si nécessaire

## 📊 Logs de débogage

Ouvrez la console du navigateur (F12) pour voir les logs:

```
✅ Événement créé dans Google Calendar: {
  id: "abc123",
  summary: "Formation React",
  start: { dateTime: "2024-01-15T09:00:00+01:00" },
  ...
}
```

En cas d'erreur:
```
❌ Erreur lors de l'ajout au calendrier: Error: ...
```

## 🚀 Déploiement en production

### 1. Mettre à jour les origines autorisées

Dans Google Cloud Console > Credentials > OAuth client ID:
- Ajoutez votre domaine de production dans "Origines JavaScript autorisées"
- Ajoutez votre domaine de production dans "URI de redirection autorisés"

### 2. Mettre à jour les variables d'environnement

Dans votre serveur de production, configurez:
```bash
VITE_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=votre-api-key
```

### 3. Publier l'application OAuth

Si vous avez choisi "External" pour l'écran de consentement:
1. Allez dans "OAuth consent screen"
2. Cliquez sur "Publish App"
3. Soumettez pour vérification Google (si nécessaire)

## 📝 Fonctionnalités implémentées

- ✅ Connexion/déconnexion Google OAuth2
- ✅ Ajout automatique d'événements au calendrier
- ✅ Gestion des tokens (stockage + expiration)
- ✅ Rappels automatiques (1 jour + 30 minutes avant)
- ✅ Fuseau horaire automatique
- ✅ Feedback visuel (toasts)
- ✅ Gestion des erreurs

## 🎯 Fonctionnalités futures possibles

- Synchronisation bidirectionnelle (lire les événements)
- Modification/suppression d'événements
- Choix du calendrier (si plusieurs calendriers)
- Personnalisation des rappels
- Export iCal pour autres calendriers
- Synchronisation avec Outlook/Apple Calendar

## 📞 Support

Pour toute question:
1. Consultez la [documentation Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
2. Vérifiez les logs dans la console (F12)
3. Vérifiez la configuration dans Google Cloud Console
