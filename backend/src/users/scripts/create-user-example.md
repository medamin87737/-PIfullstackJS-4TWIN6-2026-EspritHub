# Guide de création d'utilisateurs

## Endpoint de création

**POST** `/api/users/register` (ou `/users/register` selon votre configuration)

## Champs requis

- `name` (string, max 255) - Nom complet de l'utilisateur
- `matricule` (string, max 50, unique) - Numéro d'enregistrement employé
- `telephone` (string, max 20) - Numéro de téléphone
- `email` (string, max 255, unique) - Adresse email
- `password` (string, min 8) - Mot de passe (doit contenir majuscule, minuscule et chiffre)
- `date_embauche` (string, format ISO date) - Date d'embauche

## Champs optionnels

- `departement_id` (string, ObjectId MongoDB) - ID du département
- `manager_id` (string, ObjectId MongoDB) - ID du manager
- `status` (enum: ACTIVE, INACTIVE, SUSPENDED, TERMINATED) - Statut utilisateur (défaut: ACTIVE)
- `role` (enum: HR, MANAGER, EMPLOYEE, ADMIN) - Rôle utilisateur (défaut: EMPLOYEE)
- `profilePicture` (string) - URL de la photo de profil

## Exemples de requêtes

### 1. Créer un administrateur

```json
POST /api/users/register
Content-Type: application/json

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

### 2. Créer un utilisateur HR

```json
POST /api/users/register
Content-Type: application/json

{
  "name": "Sarah Ben Ali",
  "matricule": "HR001",
  "telephone": "+21623456789",
  "email": "hr@example.com",
  "password": "Hr123456!",
  "date_embauche": "2021-03-20",
  "status": "ACTIVE",
  "role": "HR",
  "departement_id": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

### 3. Créer un manager

```json
POST /api/users/register
Content-Type: application/json

{
  "name": "Mohamed Trabelsi",
  "matricule": "MGR001",
  "telephone": "+21634567890",
  "email": "manager@example.com",
  "password": "Manager123!",
  "date_embauche": "2022-05-10",
  "status": "ACTIVE",
  "role": "MANAGER",
  "departement_id": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

### 4. Créer un employé avec manager

```json
POST /api/users/register
Content-Type: application/json

{
  "name": "Ahmed Ben Salah",
  "matricule": "EMP001",
  "telephone": "+21645678901",
  "email": "ahmed@example.com",
  "password": "Employee123!",
  "date_embauche": "2023-06-01",
  "departement_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "manager_id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "status": "ACTIVE",
  "role": "EMPLOYEE"
}
```

### 5. Créer un employé simple (sans département ni manager)

```json
POST /api/users/register
Content-Type: application/json

{
  "name": "Youssef Mezghani",
  "matricule": "EMP003",
  "telephone": "+21667890123",
  "email": "youssef@example.com",
  "password": "Employee123!",
  "date_embauche": "2023-08-20",
  "status": "ACTIVE",
  "role": "EMPLOYEE"
}
```

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
    "departement_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "manager_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "status": "ACTIVE",
    "role": "EMPLOYEE",
    "en_ligne": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Erreurs possibles

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

### Manager non trouvé
```json
{
  "statusCode": 404,
  "message": "Manager non trouvé"
}
```

### Validation échouée
```json
{
  "statusCode": 400,
  "message": [
    "Le nom complet est requis",
    "Le matricule est requis",
    "Le mot de passe doit contenir au moins 8 caractères"
  ]
}
```

## Utilisation avec cURL

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

## Utilisation avec Postman

1. Méthode: **POST**
2. URL: `http://localhost:3000/api/users/register`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON): Utilisez un des exemples ci-dessus
