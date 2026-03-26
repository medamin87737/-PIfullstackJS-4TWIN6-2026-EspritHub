README – User Management & HR Database (Aligné sur HR-User.pdf)
1. Description

Le module User Management gère les utilisateurs et la base de données RH conformément au document `HR-User.pdf` :

- Création, consultation, mise à jour et suppression des utilisateurs.
- Modélisation des entités : **User**, **Department**, **Fiche**, **Question_Competence**, **Competence**.
- Authentification sécurisée avec JWT (JSON Web Token).

Toutes les routes sauf inscription et login nécessitent un token JWT dans le header `Authorization`.

2. Prérequis

Node.js v18+

NestJS installé

MongoDB en fonctionnement

Postman pour tester les routes

3. Installation et démarrage
# Installer les dépendances
npm install

# Démarrer le serveur NestJS
npm run start


Le serveur est accessible sur :

http://localhost:3000

4. Configuration du module JWT
   4.1 Installation
   npm install @nestjs/jwt passport-jwt

4.2 Configuration dans AuthModule,4.3 JWT Auth Guard,4.4 JwtStrateg






5. Routes API (module Users)

Le schéma User est aligné sur la table **User** du PDF (id, name, matricule, telephone, email, password, date_embauche, department_id, manager_id, status, en_ligne) **avec un champ supplémentaire applicatif `role` (HR / MANAGER / EMPLOYEE / ADMIN)** pour la gestion des droits dans l’application.

| Méthode | Route             | Accès                | Body JSON (exemple)                                                                                                                                                                                                                                   | Description                                         |
| ------- | ----------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| POST    | `/users/register` | Public               | `{ "name": "Amin Chniti", "matricule": "EMP001", "telephone": "+21612345678", "email": "amin@example.com", "password": "Strong123!", "date_embauche": "2023-01-15", "department_id": "<ObjectId>", "manager_id": "<ObjectId ou null>", "status": "ACTIVE" }` | Crée un nouvel utilisateur                          |
| POST    | `/users/login`    | Public               | `{ "email": "amin@example.com", "password": "Strong123!" }`                                                                                                                                                                                           | Authentifie un utilisateur et retourne un token JWT |
| GET     | `/users`          | JWT + rôles (HR/ADMIN) | -                                                                                                                                                                                                                                                     | Récupère tous les utilisateurs                      |
| GET     | `/users/:id`      | JWT + rôles (HR/MANAGER/ADMIN) | -                                                                                                                                                                                                                                                     | Récupère un utilisateur par ID                      |
| PATCH   | `/users/:id`      | JWT + rôles (HR/ADMIN) | ex. `{ "name": "Nouveau Nom", "telephone": "+21699999999", "status": "INACTIVE", "department_id": "<ObjectId>" }`                                                                                                                                    | Met à jour un utilisateur                           |
| DELETE  | `/users/:id`      | JWT + rôles (HR/ADMIN) | -                                                                                                                                                                                                                                                     | Supprime un utilisateur                             |






6. Authentification JWT

Après login, tu obtiens une réponse avec le token et les informations utilisateur (sans le mot de passe) :

{
  "message": "Connexion réussie",
  "user": {
    "_id": "697fa48597e35aa79dda9129",
    "name": "Amin Chniti",
    "matricule": "EMP001",
    "telephone": "+21612345678",
    "email": "amin@example.com",
    "date_embauche": "2023-01-15T00:00:00.000Z",
    "department_id": "65f1b2c3d4e5f6a7b8c9d0e1",
    "manager_id": "65f1b2c3d4e5f6a7b8c9d0e2",
  "status": "ACTIVE",
  "role": "HR",
    "en_ligne": true,
    "createdAt": "2023-01-15T10:00:00.000Z",
    "updatedAt": "2023-01-15T10:00:00.000Z"
  },
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}


Pour utiliser ce token, ajoute un header dans Postman pour toutes les routes sécurisées :

Key	Value
Authorization	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Remplace <token> par le token réel reçu lors du login.






7. Test complet avec Postman
   7.1 Inscription (register)

URL : POST http://localhost:3000/users/register

Body : JSON

{
  "name": "Amin Chniti",
  "matricule": "EMP001",
  "telephone": "+21612345678",
  "email": "amin@example.com",
  "password": "Strong123!",
  "date_embauche": "2023-01-15",
  "department_id": "65f1b2c3d4e5f6a7b8c9d0e1",
  "manager_id": "65f1b2c3d4e5f6a7b8c9d0e2",
  "status": "ACTIVE",
  "role": "EMPLOYEE"
}





7.2 Login

URL : POST http://localhost:3000/users/login

Body : JSON

{
"email": "amin@example.com",
"password": "123456"
}


Résultat : access_token → à copier pour les routes suivantes





7.3 Récupérer tous les utilisateurs

URL : GET http://localhost:3000/users

Headers :

Authorization: Bearer <token>




7.4 Récupérer un utilisateur par ID

URL : GET http://localhost:3000/users/<userId>

Headers :

Authorization: Bearer <token>





7.5 Modifier un utilisateur

URL : PATCH http://localhost:3000/users/<userId>

Headers :

Authorization: Bearer <token>
Content-Type: application/json


Body : JSON (exemple)

{
  "name": "Amin Modifié",
  "telephone": "+21699999999",
  "status": "INACTIVE"
}

7.6 Supprimer un utilisateur

URL : DELETE http://localhost:3000/users/<userId>

Headers :

Authorization: Bearer <token>

8. Notes importantes

- `register` et `login` sont publiques.
- Toutes les autres routes Users nécessitent un JWT valide dans `Authorization: Bearer <token>`.
- Certains endpoints utilisent encore `RolesGuard` (HR, MANAGER, EMPLOYEE, ADMIN) pour contrôler l’accès applicatif.

Les erreurs courantes :

401 Unauthorized → token manquant ou invalide

403 Forbidden → rôle insuffisant

404 Not Found → utilisateur non trouvé








9. Résumé fonctionnel (partie User)

- **Inscription (`POST /users/register`)** : crée un utilisateur en enregistrant les champs de la table User (PDF HR-User), hash le mot de passe et initialise `en_ligne` à `false`.
- **Login (`POST /users/login`)** : vérifie email + mot de passe, contrôle le `status` (doit être `ACTIVE`), met `en_ligne` à `true` et retourne un JWT + les données utilisateur (sans mot de passe).
- **Get All (`GET /users`)** : retourne la liste des utilisateurs (protégé par JWT et rôles applicatifs).
- **Get By ID (`GET /users/:id`)** : retourne un utilisateur par identifiant.
- **Update (`PATCH /users/:id`)** : met à jour les champs autorisés (name, telephone, email, date_embauche, department_id, manager_id, status, etc.).
- **Delete (`DELETE /users/:id`)** : supprime l’utilisateur de la base.
- **Update Online Status (`PATCH /users/:id/online-status`)** : met à jour le champ `en_ligne` (true/false).

10. Reformulation de prompt (OpenRouter)

But: reformuler le prompt utilisateur dans un format strict (instruction) avant envoi vers votre modèle NLP.

Configuration (mettre dans un fichier `.env` local, non commité) :

- OPENROUTER_API_KEY=...
- OPENROUTER_MODEL=deepseek/deepseek-chat (optionnel)
- OPENROUTER_BASE_URL=https://openrouter.ai/api/v1 (optionnel)
- OPENROUTER_TIMEOUT_MS=20000 (optionnel)

Route :

| Méthode | Route            | Accès | Body JSON (exemple) | Description |
| ------- | ---------------- | ----- | ------------------- | ----------- |
| POST    | `/chat/rewrite`  | JWT   | `{ "prompt": "texte utilisateur", "constraints": "regles du langage strict", "outputFormat": "text", "targetLanguage": "fr" }` | Retourne `{ rewritten, model, outputFormat }` |