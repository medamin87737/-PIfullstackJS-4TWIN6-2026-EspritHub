# Guide de création d'utilisateurs

## Méthode 1 : Utiliser le script de seed (Recommandé)

Le script de seed crée automatiquement des départements et des utilisateurs de test.

### Exécution du script

```bash
cd BackendTest/backend
npm run seed:users
```

Ce script va créer :
- 5 départements (IT, RH, Finance, Marketing, Operations)
- 1 Admin
- 1 HR
- 1 Manager
- 3 Employés

### Utilisateurs créés par le script

| Email | Mot de passe | Rôle | Matricule |
|-------|--------------|------|-----------|
| admin@example.com | Admin123! | ADMIN | ADM001 |
| hr@example.com | Hr123456! | HR | HR001 |
| manager@example.com | Manager123! | MANAGER | MGR001 |
| ahmed@example.com | Employee123! | EMPLOYEE | EMP001 |
| fatma@example.com | Employee123! | EMPLOYEE | EMP002 |
| youssef@example.com | Employee123! | EMPLOYEE | EMP003 |

---

## Méthode 2 : Créer un utilisateur via l'API REST

### Endpoint

**POST** `http://localhost:3000/api/users/register`

### Exemple avec cURL

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed Ben Salah",
    "matricule": "EMP001",
    "telephone": "+21645678901",
    "email": "ahmed@example.com",
    "password": "Employee123!",
    "date_embauche": "2023-06-01",
    "status": "ACTIVE",
    "role": "EMPLOYEE"
  }'
```

### Exemple avec Postman

1. **Méthode** : POST
2. **URL** : `http://localhost:3000/api/users/register`
3. **Headers** :
   - `Content-Type: application/json`
4. **Body** (raw JSON) :
```json
{
  "name": "Ahmed Ben Salah",
  "matricule": "EMP001",
  "telephone": "+21645678901",
  "email": "ahmed@example.com",
  "password": "Employee123!",
  "date_embauche": "2023-06-01",
  "status": "ACTIVE",
  "role": "EMPLOYEE"
}
```

---

## Champs requis

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `name` | string | Nom complet (max 255) | "Ahmed Ben Salah" |
| `matricule` | string | Numéro d'enregistrement (max 50, unique) | "EMP001" |
| `telephone` | string | Numéro de téléphone (max 20) | "+21645678901" |
| `email` | string | Email (max 255, unique) | "ahmed@example.com" |
| `password` | string | Mot de passe (min 8, maj+min+chiffre) | "Employee123!" |
| `date_embauche` | string | Date ISO (YYYY-MM-DD) | "2023-06-01" |

## Champs optionnels

| Champ | Type | Description | Valeurs possibles |
|-------|------|-------------|-------------------|
| `departement_id` | string | ID du département (ObjectId) | MongoDB ObjectId |
| `manager_id` | string | ID du manager (ObjectId) | MongoDB ObjectId |
| `status` | enum | Statut utilisateur | ACTIVE, INACTIVE, SUSPENDED, TERMINATED |
| `role` | enum | Rôle utilisateur | ADMIN, HR, MANAGER, EMPLOYEE |
| `profilePicture` | string | URL photo de profil | URL string |

---

## Exemples de création par rôle

### 1. Créer un Admin

```json
{
  "name": "Admin Principal",
  "matricule": "ADM001",
  "telephone": "+21612345678",
  "email": "admin@example.com",
  "password": "Admin123!",
  "date_embauche": "2020-01-15",
  "status": "ACTIVE",
  "role": "ADMIN"
}
```

### 2. Créer un HR

```json
{
  "name": "Sarah Ben Ali",
  "matricule": "HR001",
  "telephone": "+21623456789",
  "email": "hr@example.com",
  "password": "Hr123456!",
  "date_embauche": "2021-03-20",
  "status": "ACTIVE",
  "role": "HR"
}
```

### 3. Créer un Manager

```json
{
  "name": "Mohamed Trabelsi",
  "matricule": "MGR001",
  "telephone": "+21634567890",
  "email": "manager@example.com",
  "password": "Manager123!",
  "date_embauche": "2022-05-10",
  "status": "ACTIVE",
  "role": "MANAGER"
}
```

### 4. Créer un Employé

```json
{
  "name": "Ahmed Ben Salah",
  "matricule": "EMP001",
  "telephone": "+21645678901",
  "email": "ahmed@example.com",
  "password": "Employee123!",
  "date_embauche": "2023-06-01",
  "status": "ACTIVE",
  "role": "EMPLOYEE"
}
```

---

## Réponse de succès

```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "name": "Ahmed Ben Salah",
    "matricule": "EMP001",
    "telephone": "+21645678901",
    "email": "ahmed@example.com",
    "date_embauche": "2023-06-01T00:00:00.000Z",
    "status": "ACTIVE",
    "role": "EMPLOYEE",
    "en_ligne": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Erreurs courantes

### Email déjà utilisé
```json
{
  "statusCode": 409,
  "message": "Cet email est déjà utilisé"
}
```

### Matricule déjà utilisé
```json
{
  "statusCode": 409,
  "message": "Ce matricule est déjà utilisé"
}
```

### Mot de passe invalide
```json
{
  "statusCode": 400,
  "message": [
    "Le mot de passe doit contenir au moins 8 caractères",
    "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
  ]
}
```

### Manager non trouvé
```json
{
  "statusCode": 404,
  "message": "Manager non trouvé"
}
```

---

## Notes importantes

1. **Mot de passe** : Doit contenir au moins :
   - 8 caractères minimum
   - 1 majuscule
   - 1 minuscule
   - 1 chiffre

2. **Matricule** : Doit être unique dans la base de données

3. **Email** : Doit être unique et valide

4. **Date d'embauche** : Format ISO (YYYY-MM-DD)

5. **Département et Manager** : Si vous fournissez un `departement_id` ou `manager_id`, ils doivent exister dans la base de données

6. **Statut par défaut** : Si non spécifié, le statut est `ACTIVE`

7. **Rôle par défaut** : Si non spécifié, le rôle est `EMPLOYEE`
