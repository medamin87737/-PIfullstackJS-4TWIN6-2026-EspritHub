# Document des Exigences - Chatbot RH Intelligent avec Rasa

## Introduction

Ce document définit les exigences pour l'intégration d'un chatbot RH intelligent dans une application React + NestJS existante, utilisant Rasa comme moteur de traitement du langage naturel (NLP). Le chatbot permettra aux employés de poser des questions sur les activités recommandées et de mieux comprendre pourquoi ces activités leur sont suggérées, quelles compétences ils développeront, et d'autres informations contextuelles.

## Glossaire

- **Chatbot**: Le système conversationnel intelligent qui répond aux questions des employés
- **Rasa**: Le moteur NLP open-source utilisé pour comprendre et traiter les intentions des utilisateurs
- **Backend_API**: Le service NestJS qui gère les requêtes du chatbot
- **Frontend_UI**: L'interface React qui affiche le chatbot aux utilisateurs
- **Intent**: Une intention utilisateur reconnue par Rasa (ex: explain_activity, why_recommended)
- **Activity**: Une activité de formation ou de développement recommandée à un employé
- **Context**: Les données enrichies (titre, description, compétences, score) envoyées à Rasa
- **Webhook**: Le point d'entrée REST de Rasa pour recevoir les messages

## Exigences

### Exigence 1: Endpoint Backend pour Communication Chatbot

**User Story:** En tant qu'employé, je veux pouvoir envoyer des messages au chatbot concernant une activité spécifique, afin d'obtenir des réponses contextuelles et pertinentes.

#### Critères d'Acceptation

1. LE Backend_API DOIT exposer un endpoint POST /api/chat
2. QUAND une requête est reçue sur /api/chat, LE Backend_API DOIT accepter un payload JSON contenant les champs message (string) et activityId (string)
3. QUAND le champ message est vide ou absent, LE Backend_API DOIT retourner une erreur 400 avec un message descriptif
4. QUAND le champ activityId est vide ou absent, LE Backend_API DOIT retourner une erreur 400 avec un message descriptif
5. QUAND une requête valide est reçue, LE Backend_API DOIT retourner une réponse 200 avec le message du bot au format JSON

### Exigence 2: Enrichissement Contextuel des Messages

**User Story:** En tant que système backend, je veux enrichir les messages utilisateur avec les données de l'activité, afin que Rasa puisse fournir des réponses contextuelles et personnalisées.

#### Critères d'Acceptation

1. QUAND un activityId est fourni, LE Backend_API DOIT récupérer les informations de l'activité depuis la base de données
2. LE Backend_API DOIT extraire le titre, la description, les compétences requises et le score de recommandation de l'activité
3. QUAND l'activité n'existe pas, LE Backend_API DOIT retourner une erreur 404 avec un message descriptif
4. QUAND les données de l'activité sont récupérées, LE Backend_API DOIT créer un objet contexte contenant ces informations
5. LE Backend_API DOIT inclure le contexte dans la requête envoyée à Rasa sous forme de metadata ou slots

### Exigence 3: Communication avec Rasa

**User Story:** En tant que système backend, je veux communiquer avec le moteur Rasa, afin de traiter les messages utilisateur et obtenir des réponses intelligentes.

#### Critères d'Acceptation

1. LE Backend_API DOIT envoyer les requêtes à Rasa via HTTP POST à l'URL http://localhost:5005/webhooks/rest/webhook
2. QUAND une requête est envoyée à Rasa, LE Backend_API DOIT inclure le message utilisateur et le contexte enrichi
3. QUAND Rasa retourne une réponse, LE Backend_API DOIT extraire le texte de la réponse
4. SI Rasa retourne une erreur de connexion, LE Backend_API DOIT retourner une erreur 503 avec un message indiquant que le service chatbot est indisponible
5. SI Rasa retourne une erreur 4xx ou 5xx, LE Backend_API DOIT logger l'erreur et retourner une erreur 500 avec un message générique
6. QUAND Rasa retourne plusieurs messages, LE Backend_API DOIT les combiner ou retourner le premier message pertinent

### Exigence 4: Configuration des Intents Rasa

**User Story:** En tant qu'administrateur système, je veux configurer les intentions que Rasa peut reconnaître, afin que le chatbot comprenne les questions des employés en français.

#### Critères d'Acceptation

1. LE système Rasa DOIT définir l'intent explain_activity pour les questions demandant une explication de l'activité
2. LE système Rasa DOIT définir l'intent why_recommended pour les questions sur les raisons de la recommandation
3. LE système Rasa DOIT définir l'intent skills_gained pour les questions sur les compétences à développer
4. POUR CHAQUE intent, LE système Rasa DOIT inclure au minimum 10 exemples d'entraînement en français
5. LES exemples d'entraînement DOIVENT couvrir différentes formulations de la même intention (questions directes, indirectes, formelles, informelles)

### Exigence 5: Exemples d'Entraînement en Français

**User Story:** En tant que système NLP, je veux être entraîné avec des exemples variés en français, afin de reconnaître correctement les intentions des utilisateurs francophones.

#### Critères d'Acceptation

1. L'intent explain_activity DOIT inclure des exemples comme "Explique cette activité", "C'est quoi cette activité ?", "Peux-tu me décrire cette activité ?"
2. L'intent why_recommended DOIT inclure des exemples comme "Pourquoi je suis recommandé ?", "Pourquoi cette activité ?", "Pourquoi me suggères-tu ça ?"
3. L'intent skills_gained DOIT inclure des exemples comme "Quelles compétences vais-je développer ?", "Qu'est-ce que je vais apprendre ?", "Quelles sont les compétences ?"
4. LES exemples DOIVENT inclure des variations avec et sans ponctuation
5. LES exemples DOIVENT inclure des variations avec tutoiement et vouvoiement

### Exigence 6: Réponses Dynamiques avec Variables Contextuelles

**User Story:** En tant que chatbot, je veux utiliser les données contextuelles dans mes réponses, afin de fournir des informations personnalisées et pertinentes à chaque employé.

#### Critères d'Acceptation

1. LE système Rasa DOIT définir une réponse utter_explain_activity utilisant les variables {titre} et {description}
2. LE système Rasa DOIT définir une réponse utter_why_recommended utilisant les variables {score} et {objectif}
3. LE système Rasa DOIT définir une réponse utter_skills_gained utilisant la variable {competences}
4. QUAND une variable contextuelle est absente, LE système Rasa DOIT fournir une réponse générique appropriée sans afficher de valeur vide
5. LES réponses DOIVENT être rédigées en français naturel et professionnel

### Exigence 7: Gestion des Données Manquantes

**User Story:** En tant que chatbot, je veux gérer gracieusement les cas où certaines données sont absentes, afin de toujours fournir une réponse utile à l'utilisateur.

#### Critères d'Acceptation

1. SI le score de recommandation est absent, LE système Rasa DOIT répondre sans mentionner de score spécifique
2. SI les compétences requises sont absentes, LE système Rasa DOIT indiquer que les compétences ne sont pas encore définies
3. SI la description est absente, LE système Rasa DOIT utiliser uniquement le titre dans la réponse
4. POUR TOUTE donnée manquante, LE système Rasa DOIT maintenir un ton positif et encourageant
5. LE système Rasa DOIT suggérer à l'utilisateur de contacter les RH pour plus d'informations si les données sont insuffisantes

### Exigence 8: Interface Utilisateur du Chatbot

**User Story:** En tant qu'employé, je veux une interface de chat intuitive et moderne, afin de communiquer facilement avec le chatbot RH.

#### Critères d'Acceptation

1. LE Frontend_UI DOIT afficher un composant Chatbot avec une zone de messages scrollable
2. LES messages utilisateur DOIVENT être alignés à droite avec un style visuel distinct
3. LES messages du bot DOIVENT être alignés à gauche avec un style visuel distinct
4. LE Frontend_UI DOIT inclure un champ de saisie (input) pour les messages utilisateur
5. LE Frontend_UI DOIT inclure un bouton "Envoyer" pour soumettre les messages
6. QUAND un nouveau message est ajouté, LE Frontend_UI DOIT scroller automatiquement vers le bas
7. LE Frontend_UI DOIT afficher un indicateur de chargement pendant que le bot traite la requête
8. L'interface DOIT être responsive et fonctionner sur mobile et desktop

### Exigence 9: Boutons de Suggestions Rapides

**User Story:** En tant qu'employé, je veux des suggestions de questions prédéfinies, afin de découvrir rapidement ce que je peux demander au chatbot.

#### Critères d'Acceptation

1. LE Frontend_UI DOIT afficher des boutons de suggestions rapides au démarrage du chat
2. LES suggestions DOIVENT inclure "Pourquoi recommandé ?" comme option
3. LES suggestions DOIVENT inclure "Quelles compétences ?" comme option
4. LES suggestions DOIVENT inclure "Explique cette activité" comme option
5. QUAND un bouton de suggestion est cliqué, LE Frontend_UI DOIT envoyer automatiquement le message correspondant
6. APRÈS l'envoi d'un message via suggestion, LES boutons DOIVENT rester visibles pour permettre d'autres questions

### Exigence 10: Connexion Frontend-Backend

**User Story:** En tant que composant frontend, je veux communiquer avec le backend de manière fiable, afin d'envoyer les messages utilisateur et recevoir les réponses du bot.

#### Critères d'Acceptation

1. LE Frontend_UI DOIT envoyer les requêtes à l'endpoint POST /api/chat
2. QUAND un message est envoyé, LE Frontend_UI DOIT inclure le message et l'activityId dans le payload
3. QUAND une réponse est reçue, LE Frontend_UI DOIT afficher le message du bot dans l'interface
4. SI une erreur réseau se produit, LE Frontend_UI DOIT afficher un message d'erreur convivial
5. SI le backend retourne une erreur 4xx ou 5xx, LE Frontend_UI DOIT afficher un message d'erreur approprié
6. LE Frontend_UI DOIT désactiver le bouton d'envoi pendant le traitement d'une requête

### Exigence 11: État de Chargement et Feedback Utilisateur

**User Story:** En tant qu'employé, je veux voir clairement quand le chatbot traite ma question, afin de savoir que mon message a été pris en compte.

#### Critères d'Acceptation

1. QUAND un message est envoyé, LE Frontend_UI DOIT afficher un indicateur de chargement (loader)
2. L'indicateur de chargement DOIT être visible dans la zone de messages
3. QUAND la réponse du bot arrive, LE Frontend_UI DOIT masquer l'indicateur de chargement
4. PENDANT le chargement, LE champ de saisie DOIT être désactivé
5. PENDANT le chargement, LE bouton d'envoi DOIT être désactivé

### Exigence 12: Architecture Modulaire Backend

**User Story:** En tant que développeur, je veux un code backend propre et modulaire, afin de faciliter la maintenance et les évolutions futures.

#### Critères d'Acceptation

1. LE Backend_API DOIT implémenter un ChatController pour gérer les routes
2. LE Backend_API DOIT implémenter un ChatService pour la logique métier
3. LE ChatService DOIT avoir une méthode dédiée pour récupérer les données d'activité
4. LE ChatService DOIT avoir une méthode dédiée pour communiquer avec Rasa
5. LE ChatService DOIT avoir une méthode dédiée pour enrichir le contexte
6. LES dépendances externes (axios, services d'activités) DOIVENT être injectées via le système de DI de NestJS

### Exigence 13: Architecture Modulaire Frontend

**User Story:** En tant que développeur, je veux un code frontend propre et modulaire, afin de faciliter la maintenance et la réutilisation des composants.

#### Critères d'Acceptation

1. LE Frontend_UI DOIT implémenter un composant Chatbot réutilisable
2. LE composant Chatbot DOIT accepter activityId comme prop
3. LE Frontend_UI DOIT implémenter un service chatService pour les appels API
4. LE composant DOIT gérer son propre état (messages, loading, erreurs)
5. LES styles DOIVENT être séparés dans un fichier CSS ou styled-components dédié
6. LE composant DOIT être typé avec TypeScript pour la sécurité des types

### Exigence 14: Configuration Rasa Stories

**User Story:** En tant qu'administrateur système, je veux définir des parcours conversationnels, afin que Rasa puisse gérer des dialogues cohérents.

#### Critères d'Acceptation

1. LE système Rasa DOIT définir une story pour le flux explain_activity
2. LE système Rasa DOIT définir une story pour le flux why_recommended
3. LE système Rasa DOIT définir une story pour le flux skills_gained
4. CHAQUE story DOIT inclure l'intent utilisateur et la réponse correspondante
5. LES stories DOIVENT permettre des conversations multi-tours si nécessaire

### Exigence 15: Gestion des Erreurs et Logging

**User Story:** En tant qu'administrateur système, je veux que les erreurs soient correctement loggées, afin de pouvoir diagnostiquer et résoudre les problèmes rapidement.

#### Critères d'Acceptation

1. LE Backend_API DOIT logger toutes les erreurs de communication avec Rasa
2. LE Backend_API DOIT logger les requêtes invalides avec les détails de validation
3. LE Backend_API DOIT logger les activités non trouvées avec l'activityId concerné
4. LES logs DOIVENT inclure un timestamp et un niveau de sévérité (error, warn, info)
5. LES logs NE DOIVENT PAS contenir de données sensibles des utilisateurs

### Exigence 16: Non-Modification de la Base de Données

**User Story:** En tant qu'architecte système, je veux que l'intégration du chatbot n'impacte pas le schéma de base de données existant, afin de minimiser les risques et la complexité.

#### Critères d'Acceptation

1. L'intégration du chatbot NE DOIT PAS créer de nouvelles tables dans la base de données
2. L'intégration du chatbot NE DOIT PAS modifier les tables existantes
3. L'intégration du chatbot NE DOIT PAS ajouter de colonnes aux tables existantes
4. LE système DOIT utiliser uniquement les données existantes en lecture seule
5. SI des données de conversation doivent être persistées, ELLES DOIVENT être stockées dans Rasa ou en mémoire

### Exigence 17: Configuration et Déploiement Rasa

**User Story:** En tant qu'administrateur système, je veux une configuration Rasa claire et déployable, afin de pouvoir installer et exécuter le moteur NLP facilement.

#### Critères d'Acceptation

1. LE projet Rasa DOIT inclure un fichier config.yml avec la configuration du pipeline NLP
2. LE projet Rasa DOIT inclure un fichier domain.yml définissant les intents, réponses et slots
3. LE projet Rasa DOIT inclure un fichier nlu.yml avec tous les exemples d'entraînement
4. LE projet Rasa DOIT inclure un fichier stories.yml avec les parcours conversationnels
5. LE projet Rasa DOIT pouvoir être entraîné avec la commande "rasa train"
6. LE serveur Rasa DOIT pouvoir être démarré avec la commande "rasa run --enable-api --cors '*'"

### Exigence 18: Expérience Utilisateur Fluide

**User Story:** En tant qu'employé, je veux une expérience de chat fluide et réactive, afin de pouvoir obtenir rapidement les informations dont j'ai besoin.

#### Critères d'Acceptation

1. QUAND je tape un message et appuie sur Entrée, LE message DOIT être envoyé immédiatement
2. LES messages DOIVENT apparaître instantanément dans l'interface après envoi
3. LE temps de réponse du bot DOIT être inférieur à 3 secondes dans des conditions normales
4. L'interface NE DOIT PAS bloquer ou geler pendant le traitement
5. LES animations de chargement DOIVENT être fluides et non intrusives

### Exigence 19: Accessibilité et Utilisabilité

**User Story:** En tant qu'employé, je veux que le chatbot soit accessible et facile à utiliser, afin que tous les employés puissent en bénéficier.

#### Critères d'Acceptation

1. LE champ de saisie DOIT avoir un label ou placeholder descriptif
2. LES boutons DOIVENT avoir des labels clairs et descriptifs
3. LE contraste des couleurs DOIT respecter les normes WCAG AA
4. LE composant DOIT être navigable au clavier (Tab, Entrée)
5. LES messages d'erreur DOIVENT être clairs et indiquer comment résoudre le problème

### Exigence 20: Validation et Tests

**User Story:** En tant que développeur, je veux que le code soit testable et validé, afin d'assurer la qualité et la fiabilité du système.

#### Critères d'Acceptation

1. LE Backend_API DOIT valider les entrées utilisateur avec des DTOs TypeScript
2. LE Backend_API DOIT utiliser class-validator pour la validation des payloads
3. LE Frontend_UI DOIT valider que activityId est fourni avant d'afficher le chatbot
4. LE code DOIT inclure des types TypeScript stricts pour tous les composants
5. LES fonctions critiques DOIVENT avoir une gestion d'erreur appropriée avec try-catch
