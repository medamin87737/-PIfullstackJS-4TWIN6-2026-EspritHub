# Fonctionnalité : Envoi d'Email d'Invitation aux Employés

## Description
Cette fonctionnalité permet au manager d'envoyer automatiquement un email d'invitation à un employé lorsqu'il l'accepte pour une activité.

## Workflow

1. **Manager consulte les recommandations** : Le manager voit la liste des employés recommandés pour une activité dans `/manager/activity/:id`

2. **Manager accepte un employé** : Le manager clique sur le bouton "Accepter" pour valider la participation d'un employé

3. **Bouton Email activé** : Une fois l'employé accepté (statut = `MANAGER_APPROVED`), le bouton "Envoyer Email" devient actif

4. **Envoi de l'email** : Le manager clique sur "Envoyer Email" pour envoyer l'invitation par email à l'employé

5. **Email reçu** : L'employé reçoit un email avec les détails de l'activité et des liens pour accepter ou refuser

## API Backend

### Endpoint
```
POST /manager/activities/:activityId/send-invitation/:employeeId
```

### Authentification
- Requiert un token JWT
- Rôle requis : `MANAGER`

### Paramètres
- `activityId` : ID de l'activité (dans l'URL)
- `employeeId` : ID de l'employé (dans l'URL)

### Validation
- Vérifie que l'activité existe
- Vérifie que l'employé existe et a un email
- Vérifie que l'employé a été accepté (statut `MANAGER_APPROVED`)

### Réponse
```json
{
  "message": "Email d'invitation envoyé à [Nom Employé]",
  "employee": {
    "id": "...",
    "name": "...",
    "email": "..."
  },
  "activity": {
    "id": "...",
    "title": "..."
  }
}
```

## Interface Frontend

### Composant
`frontend/src/pages/manager/ManagerActivityDetail.tsx`

### Comportement du bouton "Envoyer Email"

#### État INACTIF (grisé)
- Affiché pour tous les employés qui ne sont pas encore acceptés
- Statuts concernés : `PENDING`, `HR_APPROVED`, `SENT_TO_MANAGER`, `MANAGER_REJECTED`, etc.
- Classe CSS : `bg-gray-100 text-gray-400 cursor-not-allowed`

#### État ACTIF (bleu)
- Affiché uniquement pour les employés avec statut `MANAGER_APPROVED`
- Permet d'envoyer l'email d'invitation
- Classe CSS : `bg-blue-100 text-blue-700 hover:bg-blue-200`

#### État ENVOI EN COURS
- Texte du bouton change en "Envoi..."
- Bouton désactivé pendant l'envoi

## Configuration Email

### Variables d'environnement (backend/.env)
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=votre-email@gmail.com
MAIL_PASS=votre-mot-de-passe-app
MAIL_FROM=HR System <noreply@company.com>
FRONTEND_URL=http://localhost:5173
```

### Template Email
Le template utilisé est : `backend/src/mail/templates/employee-invitation.hbs`

## Modifications Apportées

### Backend
1. **manager.controller.ts** : Ajout de la route `POST /manager/activities/:activityId/send-invitation/:employeeId`
2. **manager.service.ts** : Ajout de la méthode `sendActivityInvitation()`
3. **manager.module.ts** : Import de `MailModule` et `RecommendationSchema`

### Frontend
1. **ManagerActivityDetail.tsx** : 
   - Ajout de l'état `sendingEmail` pour gérer l'envoi
   - Ajout de la fonction `sendInvitationEmail()`
   - Ajout du bouton "Envoyer Email" avec logique conditionnelle
   - Import de l'icône `Mail` de lucide-react

## Tests

### Test manuel
1. Se connecter en tant que manager
2. Aller sur une activité avec des recommandations
3. Accepter un employé
4. Vérifier que le bouton "Envoyer Email" devient actif
5. Cliquer sur "Envoyer Email"
6. Vérifier que l'email est bien reçu par l'employé

### Cas d'erreur
- Employé sans email : Message d'erreur "L'employé n'a pas d'adresse email"
- Employé non accepté : Message d'erreur "L'employé doit être accepté avant d'envoyer l'invitation"
- Activité inexistante : Message d'erreur "Activité introuvable"
