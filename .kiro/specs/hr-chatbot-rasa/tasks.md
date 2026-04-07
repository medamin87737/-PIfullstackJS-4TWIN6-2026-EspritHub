# Plan d'Implémentation: Chatbot RH Intelligent avec Rasa

## Vue d'Ensemble

Ce plan d'implémentation décompose l'intégration du chatbot RH en tâches incrémentales et exécutables. Chaque tâche construit sur les précédentes pour créer un système fonctionnel complet permettant aux employés d'interagir avec un chatbot intelligent pour comprendre les activités recommandées.

L'implémentation suit trois axes parallèles qui convergent:
1. Configuration et entraînement de Rasa (moteur NLP)
2. Développement du backend NestJS (API et logique métier)
3. Développement du frontend React (interface utilisateur)

## Tâches

- [x] 1. Configuration initiale du projet Rasa
  - Créer la structure de répertoires Rasa (config.yml, domain.yml, data/nlu.yml, data/stories.yml)
  - Configurer le pipeline NLP pour le français dans config.yml
  - Définir les intents de base (greet, goodbye, explain_activity, why_recommended, skills_gained) dans domain.yml
  - _Exigences: 4.1, 4.2, 4.3, 17.1, 17.2_

- [ ] 2. Création des exemples d'entraînement NLU
  - [x] 2.1 Ajouter les exemples d'entraînement pour explain_activity dans data/nlu.yml
    - Inclure minimum 10 exemples variés en français
    - Inclure variations avec/sans ponctuation et tutoiement/vouvoiement
    - _Exigences: 4.4, 5.1, 5.4, 5.5_
  
  - [x] 2.2 Ajouter les exemples d'entraînement pour why_recommended dans data/nlu.yml
    - Inclure minimum 10 exemples variés en français
    - Inclure variations avec/sans ponctuation et tutoiement/vouvoiement
    - _Exigences: 4.4, 5.2, 5.4, 5.5_
  
  - [x] 2.3 Ajouter les exemples d'entraînement pour skills_gained dans data/nlu.yml
    - Inclure minimum 10 exemples variés en français
    - Inclure variations avec/sans ponctuation et tutoiement/vouvoiement
    - _Exigences: 4.4, 5.3, 5.4, 5.5_
  
  - [x] 2.4 Tester la complétude des exemples d'entraînement
    - **Property 10: Complétude des exemples d'entraînement**
    - **Valide: Exigences 4.4**

- [x] 3. Configuration des réponses Rasa avec variables contextuelles
  - Définir les slots (titre, description, competences, score, objectif) dans domain.yml
  - Créer utter_explain_activity avec variables {titre} et {description}
  - Créer utter_why_recommended avec variables {score} et {objectif}
  - Créer utter_skills_gained avec variable {competences}
  - Ajouter réponses alternatives pour données manquantes (utter_explain_activity_no_description, utter_why_recommended_no_score, utter_skills_gained_no_data)
  - _Exigences: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.5_

- [x] 4. Création des stories conversationnelles
  - Créer story pour le flux explain_activity dans data/stories.yml
  - Créer story pour le flux why_recommended dans data/stories.yml
  - Créer story pour le flux skills_gained dans data/stories.yml
  - Créer story pour questions multiples enchaînées
  - _Exigences: 14.1, 14.2, 14.3, 14.4_

- [x] 5. Entraînement et validation du modèle Rasa
  - Exécuter `rasa train` pour entraîner le modèle
  - Exécuter `rasa data validate` pour valider la configuration
  - Démarrer le serveur Rasa avec `rasa run --enable-api --cors '*'`
  - Vérifier que le webhook REST est accessible sur http://localhost:5005/webhooks/rest/webhook
  - _Exigences: 17.5, 17.6_

- [x] 6. Checkpoint Rasa - Vérifier que Rasa fonctionne correctement
  - Tester manuellement quelques requêtes au webhook REST
  - Vérifier que les intents sont correctement reconnus
  - S'assurer que les réponses utilisent les variables contextuelles


- [x] 7. Création des DTOs et interfaces backend
  - Créer ChatMessageDto avec validation class-validator (message: string, activityId: string)
  - Créer ChatResponseDto (message: string, timestamp: Date, success: boolean)
  - Créer interface RasaContext (titre, description, competences, score, objectif)
  - Créer interface RasaWebhookRequest et RasaWebhookResponse
  - _Exigences: 12.1, 20.1, 20.2_

- [ ] 8. Implémentation du ChatService backend
  - [x] 8.1 Créer ChatService avec injection de dépendances (HttpService, ActivityService, Logger)
    - Implémenter la méthode processMessage(dto: ChatMessageDto)
    - _Exigences: 12.2, 12.6_
  
  - [x] 8.2 Implémenter la méthode getActivityData(activityId: string)
    - Récupérer l'activité depuis la base de données
    - Gérer le cas où l'activité n'existe pas (throw NotFoundException)
    - _Exigences: 2.1, 2.3, 12.3_
  
  - [~] 8.3 Écrire un test de propriété pour la récupération des données d'activité
    - **Property 3: Récupération des données d'activité**
    - **Valide: Exigences 2.1, 2.2**
  
  - [x] 8.4 Implémenter la méthode enrichContext(activity: Activity)
    - Mapper les champs de l'activité vers RasaContext
    - Fournir des valeurs par défaut pour les champs manquants
    - _Exigences: 2.2, 2.4, 2.5, 12.5_
  
  - [~] 8.5 Écrire un test de propriété pour l'enrichissement du contexte
    - **Property 4: Enrichissement du contexte**
    - **Valide: Exigences 2.4, 2.5**
  
  - [x] 8.6 Implémenter la méthode sendToRasa(message: string, context: RasaContext)
    - Construire le payload RasaWebhookRequest
    - Envoyer la requête POST à http://localhost:5005/webhooks/rest/webhook
    - Extraire le texte de la réponse (gérer les réponses multiples)
    - Gérer les erreurs de connexion (throw ServiceUnavailableException)
    - Gérer les erreurs Rasa 4xx/5xx (logger et throw InternalServerErrorException)
    - _Exigences: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 12.4_
  
  - [~] 8.7 Écrire des tests unitaires pour les cas d'erreur Rasa
    - Tester erreur de connexion → 503
    - Tester erreur Rasa 4xx/5xx → 500 avec logging
    - _Exigences: 3.4, 3.5_
  
  - [~] 8.8 Écrire un test de propriété pour la communication avec Rasa
    - **Property 5: Communication avec Rasa**
    - **Valide: Exigences 3.1, 3.2**

- [ ] 9. Implémentation du ChatController backend
  - [x] 9.1 Créer ChatController avec route POST /api/chat
    - Injecter ChatService
    - Implémenter la méthode sendMessage(@Body() dto: ChatMessageDto)
    - Appeler chatService.processMessage(dto)
    - Retourner ChatResponseDto
    - _Exigences: 1.1, 1.2, 1.5, 12.1_
  
  - [~] 9.2 Écrire un test de propriété pour la validation des payloads valides
    - **Property 1: Validation des payloads valides**
    - **Valide: Exigences 1.2, 1.5**
  
  - [~] 9.3 Écrire un test de propriété pour le rejet des payloads invalides
    - **Property 2: Rejet des payloads invalides**
    - **Valide: Exigences 1.3, 1.4**
  
  - [~] 9.4 Écrire des tests unitaires pour les cas d'erreur spécifiques
    - Tester message vide → 400
    - Tester activityId vide → 400
    - Tester activité non trouvée → 404
    - _Exigences: 1.3, 1.4, 2.3_

- [x] 10. Implémentation du logging backend
  - Ajouter des logs ERROR pour les erreurs de communication Rasa
  - Ajouter des logs WARN pour les activités non trouvées
  - Ajouter des logs INFO pour les requêtes traitées avec succès
  - S'assurer que les logs incluent timestamp et niveau de sévérité
  - S'assurer que les logs ne contiennent pas de données sensibles
  - _Exigences: 15.1, 15.2, 15.3, 15.4, 15.5_

- [~] 11. Checkpoint Backend - Tester l'API avec Postman/curl
  - Vérifier que POST /api/chat accepte les requêtes valides
  - Vérifier que les erreurs de validation retournent 400
  - Vérifier que les activités non trouvées retournent 404
  - Vérifier que Rasa indisponible retourne 503
  - S'assurer que tous les tests passent


- [x] 12. Création des types et interfaces frontend
  - Créer interface ChatbotProps (activityId: string, onClose?: () => void)
  - Créer interface Message (id: string, text: string, sender: 'user' | 'bot', timestamp: Date)
  - Créer interface ChatState (messages: Message[], isLoading: boolean, error: string | null, activityId: string)
  - Créer interface QuickSuggestion (id: string, text: string, displayText: string)
  - _Exigences: 13.2, 13.4, 13.6_

- [x] 13. Implémentation du ChatService frontend
  - Créer classe ChatService avec méthode sendMessage(message: string, activityId: string)
  - Implémenter l'appel fetch à POST /api/chat
  - Gérer les erreurs réseau et HTTP
  - Retourner le message de la réponse
  - _Exigences: 10.1, 10.2, 13.3_

- [ ] 14. Implémentation du composant Chatbot React
  - [x] 14.1 Créer le composant Chatbot avec structure de base
    - Définir les props (activityId, onClose)
    - Initialiser l'état (messages, inputValue, isLoading, error)
    - Créer les refs (messagesEndRef pour le scroll)
    - _Exigences: 8.1, 13.1, 13.2, 13.4_
  
  - [x] 14.2 Implémenter la validation de activityId
    - Vérifier que activityId est fourni et non vide
    - Afficher un message d'erreur si invalide
    - _Exigences: 20.3_
  
  - [~] 14.3 Écrire un test de propriété pour la validation de activityId
    - **Property 30: Validation de activityId**
    - **Valide: Exigences 20.3**
  
  - [x] 14.4 Implémenter la fonction handleSendMessage
    - Valider que le message n'est pas vide
    - Ajouter le message utilisateur immédiatement à l'état
    - Activer isLoading
    - Appeler chatService.sendMessage
    - Ajouter la réponse du bot à l'état
    - Désactiver isLoading
    - Gérer les erreurs (afficher message d'erreur convivial)
    - Vider le champ de saisie après envoi
    - _Exigences: 10.2, 10.3, 10.4, 10.5, 18.1, 18.2_
  
  - [~] 14.5 Écrire un test de propriété pour l'ajout immédiat des messages utilisateur
    - **Property 26: Ajout immédiat des messages utilisateur**
    - **Valide: Exigences 18.2**
  
  - [~] 14.6 Écrire des tests unitaires pour la gestion des erreurs
    - Tester erreur réseau → message d'erreur convivial
    - Tester erreur backend 4xx/5xx → message d'erreur approprié
    - _Exigences: 10.4, 10.5_
  
  - [x] 14.7 Implémenter le scroll automatique avec useEffect
    - Déclencher le scroll quand messages change
    - Utiliser messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    - _Exigences: 8.6_
  
  - [~] 14.8 Écrire un test de propriété pour le scroll automatique
    - **Property 16: Scroll automatique**
    - **Valide: Exigences 8.6**
  
  - [x] 14.9 Implémenter la gestion de la touche Entrée
    - Ajouter onKeyPress sur le champ de saisie
    - Envoyer le message si la touche est 'Enter' et le champ n'est pas vide
    - _Exigences: 18.1_
  
  - [~] 14.10 Écrire un test de propriété pour l'envoi via touche Entrée
    - **Property 25: Envoi via touche Entrée**
    - **Valide: Exigences 18.1**

- [ ] 15. Implémentation de l'interface utilisateur du Chatbot
  - [x] 15.1 Créer la structure JSX du composant
    - Zone de messages scrollable
    - Affichage des messages (user à droite, bot à gauche)
    - Champ de saisie avec placeholder
    - Bouton "Envoyer"
    - Indicateur de chargement
    - _Exigences: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_
  
  - [x] 15.2 Implémenter les boutons de suggestions rapides
    - Définir QUICK_SUGGESTIONS avec "Pourquoi recommandé ?", "Quelles compétences ?", "Explique cette activité"
    - Afficher les boutons au démarrage
    - Gérer le clic pour envoyer automatiquement le message
    - Garder les boutons visibles après envoi
    - _Exigences: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [~] 15.3 Écrire un test de propriété pour l'envoi via suggestions
    - **Property 19: Envoi via suggestions**
    - **Valide: Exigences 9.5**
  
  - [~] 15.4 Écrire un test de propriété pour la persistance des suggestions
    - **Property 20: Persistance des suggestions**
    - **Valide: Exigences 9.6**
  
  - [x] 15.5 Implémenter l'état de chargement
    - Afficher le loader dans la zone de messages pendant isLoading
    - Désactiver le champ de saisie pendant isLoading
    - Désactiver le bouton d'envoi pendant isLoading
    - _Exigences: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [~] 15.6 Écrire un test de propriété pour l'affichage du loader
    - **Property 17: Affichage du loader**
    - **Valide: Exigences 8.7, 11.1, 11.3, 11.4, 11.5**
  
  - [~] 15.7 Écrire des tests unitaires pour la structure de l'interface
    - Vérifier que l'input field existe
    - Vérifier que le bouton "Envoyer" existe
    - Vérifier que les suggestions sont affichées
    - _Exigences: 8.4, 8.5, 9.1_

- [ ] 16. Création des styles CSS pour le Chatbot
  - [x] 16.1 Créer le fichier Chatbot.css avec styles de base
    - Styles pour le conteneur principal
    - Styles pour la zone de messages scrollable
    - Styles pour les messages utilisateur (alignés à droite, couleur distincte)
    - Styles pour les messages bot (alignés à gauche, couleur distincte)
    - Styles pour le champ de saisie et le bouton
    - Styles pour les boutons de suggestions
    - Styles pour l'indicateur de chargement
    - _Exigences: 8.2, 8.3, 13.5_
  
  - [~] 16.2 Écrire un test de propriété pour l'alignement des messages
    - **Property 15: Alignement des messages**
    - **Valide: Exigences 8.2, 8.3**
  
  - [x] 16.3 Implémenter le responsive design
    - Media queries pour mobile (320px-768px)
    - Media queries pour desktop (>768px)
    - S'assurer qu'il n'y a pas de débordement horizontal
    - _Exigences: 8.8_
  
  - [~] 16.4 Écrire un test de propriété pour le responsive design
    - **Property 18: Responsive design**
    - **Valide: Exigences 8.8**
  
  - [x] 16.5 Implémenter l'accessibilité des couleurs
    - S'assurer que le contraste respecte WCAG AA (ratio 4.5:1)
    - Ajouter des labels pour les champs de formulaire
    - Ajouter des aria-labels pour les boutons
    - _Exigences: 19.1, 19.2, 19.3_
  
  - [~] 16.6 Écrire un test de propriété pour le contraste des couleurs
    - **Property 29: Contraste des couleurs**
    - **Valide: Exigences 19.3**

- [~] 17. Implémentation de l'accessibilité clavier
  - Vérifier que tous les éléments interactifs sont accessibles via Tab
  - Implémenter la navigation au clavier (Tab, Entrée, Espace)
  - Gérer le focus correctement après les interactions
  - _Exigences: 19.4_

- [~] 17.1 Écrire un test de propriété pour la navigation au clavier
  - **Property 28: Navigation au clavier**
  - **Valide: Exigences 19.4**

- [x] 18. Intégration du composant Chatbot dans l'application
  - Importer le composant Chatbot dans la page des activités recommandées
  - Passer l'activityId comme prop
  - Ajouter un bouton pour ouvrir/fermer le chatbot
  - Tester l'intégration complète

- [ ] 19. Tests d'intégration end-to-end
  - [~] 19.1 Écrire un test E2E pour le flux complet
    - Démarrer Rasa, backend et frontend
    - Simuler l'envoi d'un message "Explique cette activité"
    - Vérifier que la réponse du bot apparaît
    - Vérifier que le temps de réponse est < 3 secondes
    - _Exigences: 18.3_
  
  - [~] 19.2 Écrire un test E2E pour les suggestions rapides
    - Cliquer sur "Pourquoi recommandé ?"
    - Vérifier que le message est envoyé et la réponse reçue
  
  - [~] 19.3 Écrire un test E2E pour la gestion des erreurs
    - Arrêter Rasa
    - Envoyer un message
    - Vérifier que l'erreur 503 est gérée correctement

- [x] 20. Documentation et configuration finale
  - Créer un fichier README.md pour le projet Rasa avec instructions de démarrage
  - Documenter les variables d'environnement nécessaires
  - Créer un script de démarrage pour lancer Rasa, backend et frontend ensemble
  - Ajouter des commentaires JSDoc pour les fonctions principales

- [~] 21. Checkpoint Final - Vérifier que tout fonctionne
  - Démarrer Rasa avec `rasa run --enable-api --cors '*'`
  - Démarrer le backend NestJS
  - Démarrer le frontend React
  - Tester manuellement tous les flux conversationnels
  - Vérifier que tous les tests passent (backend, frontend, Rasa)
  - Vérifier que les logs sont corrects
  - Vérifier que l'accessibilité est respectée
  - S'assurer que l'expérience utilisateur est fluide

## Notes

- Les tâches marquées avec `*` sont des tests optionnels qui peuvent être sautés pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les checkpoints assurent une validation incrémentale
- Les tests de propriétés valident les propriétés de correction universelles
- Les tests unitaires valident des exemples spécifiques et des cas limites
- L'implémentation peut être parallélisée: Rasa (tâches 1-6), Backend (tâches 7-11), Frontend (tâches 12-17)
