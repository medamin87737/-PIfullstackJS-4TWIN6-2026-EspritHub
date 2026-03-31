# Plan d'Implémentation: Hand Gesture Control

## Overview

Ce plan d'implémentation décompose le système Hand Gesture Control en tâches incrémentales. Chaque tâche construit sur les précédentes et se termine par une intégration fonctionnelle. Les tâches marquées d'un astérisque (*) sont optionnelles et peuvent être sautées pour un MVP plus rapide.

## Tasks

- [x] 1. Créer les types TypeScript et les interfaces de base
  - Créer le fichier `src/types/hand-gesture.types.ts`
  - Définir les interfaces: `NormalizedLandmark`, `GestureType`, `GestureDetectionResult`, `HandGestureControlProps`, `HandGestureControlState`
  - Définir les types pour les recommandations et les événements de geste
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Implémenter le module Gesture Detector (fonctions pures)
  - [x] 2.1 Créer le fichier `src/utils/gestureDetector.ts`
    - Implémenter `euclideanDistance(p1, p2)`
    - Implémenter `calculateReferenceDistance(landmarks)`
    - Implémenter `normalizedDistance(p1, p2, refDistance)`
    - _Requirements: 3.6_

  - [ ]* 2.2 Écrire le test de propriété pour le calcul de distance de référence
    - **Property 5: Calcul de la distance de référence**
    - **Validates: Requirements 3.6**

  - [x] 2.3 Implémenter les fonctions de détection de gestes
    - Implémenter `areFingersClosed(mcpIndices, landmarks)`
    - Implémenter `isThumbsUp(landmarks)`
    - Implémenter `isThumbsDown(landmarks)`
    - Implémenter `isOpenHand(landmarks)`
    - Implémenter `isFist(landmarks)`
    - Implémenter `detectGesture(landmarks)` qui orchestre toutes les détections
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.4 Écrire les tests de propriétés pour la détection de gestes
    - **Property 6: Détection des gestes par pattern de landmarks**
    - **Property 7: Détection basée sur distances normalisées**
    - **Property 8: Geste inconnu par défaut**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 3. Implémenter le module Gesture Validator
  - [x] 3.1 Créer le fichier `src/utils/gestureValidator.ts`
    - Créer la classe `GestureValidator` avec l'état interne
    - Implémenter la méthode `update(gesture)` avec logique de stabilité
    - Implémenter la méthode `reset()`
    - Implémenter la méthode `isInCooldown()`
    - Gérer le comptage des changements de geste pour détecter l'instabilité
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5_

  - [ ]* 3.2 Écrire les tests de propriétés pour la validation de gestes
    - **Property 9: Réinitialisation du timer sur changement de geste**
    - **Property 10: Cooldown après validation**
    - **Property 11: Progression visuelle de la stabilité**
    - **Property 16: Détection d'instabilité**
    - **Validates: Requirements 4.2, 4.3, 4.5, 7.5**

- [ ] 4. Checkpoint - Vérifier les modules de base
  - Exécuter tous les tests des modules Gesture Detector et Validator
  - Vérifier que les fonctions pures fonctionnent correctement avec des données mockées
  - Demander à l'utilisateur si des questions se posent

- [ ] 5. Implémenter le Canvas Renderer
  - [ ] 5.1 Créer le fichier `src/utils/canvasRenderer.ts`
    - Définir les connexions de la main `HAND_CONNECTIONS`
    - Implémenter `renderHand(canvas, landmarks, options)`
    - Dessiner les landmarks (points)
    - Dessiner les connexions (lignes)
    - Gérer le redimensionnement du canvas
    - _Requirements: 2.2_

  - [ ]* 5.2 Écrire les tests unitaires pour le rendu
    - Tester que tous les 21 landmarks sont dessinés
    - Tester que les connexions sont dessinées
    - Tester le redimensionnement du canvas
    - _Requirements: 2.2_

  - [ ]* 5.3 Écrire le test de propriété pour le rendu des landmarks
    - **Property 4: Rendu des landmarks sur canvas**
    - **Validates: Requirements 2.2**

- [ ] 6. Implémenter le Recommendation Service
  - [ ] 6.1 Créer le fichier `src/services/recommendationService.ts`
    - Créer la classe `RecommendationService` avec le token JWT
    - Implémenter `respondToRecommendation(id, response, justification)`
    - Gérer les appels axios avec headers d'authentification
    - Implémenter `refreshTokenIfNeeded()` pour gérer l'expiration du token
    - Gérer les erreurs HTTP (401, 404, 500)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 6.2 Écrire les tests unitaires pour le service API
    - Tester les appels API réussis
    - Tester la gestion des erreurs 401, 404, 500
    - Tester le refresh du token
    - Tester la redirection vers login si token non renouvelable
    - _Requirements: 5.3, 5.4, 7.3, 7.4_

  - [ ]* 6.3 Écrire les tests de propriétés pour le format API
    - **Property 13: Format complet de la requête API**
    - **Property 14: Gestion des codes de réponse HTTP**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 7. Implémenter le hook useHandGesture
  - [ ] 7.1 Créer le fichier `src/hooks/useHandGesture.ts`
    - Créer les refs pour video et canvas
    - Implémenter `startCamera()` avec gestion des permissions
    - Initialiser MediaPipe Hands avec confiance minimale 0.7
    - Implémenter le traitement des frames en temps réel
    - Appeler le Gesture Detector sur chaque frame
    - Appeler le Canvas Renderer pour dessiner les landmarks
    - Calculer et suivre le FPS
    - Gérer les erreurs de webcam et MediaPipe
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 7.1, 7.2_

  - [ ] 7.2 Implémenter `stopCamera()` et le nettoyage des ressources
    - Arrêter le flux vidéo
    - Libérer MediaPipe Hands
    - Nettoyer les timers et event listeners
    - Utiliser `useEffect` cleanup pour le démontage du composant
    - _Requirements: 1.4, 8.2_

  - [ ] 7.3 Implémenter les optimisations de performance
    - Détecter si l'onglet est actif avec `document.hidden`
    - Réduire le FPS à 5 si l'onglet est inactif
    - Utiliser `requestAnimationFrame` pour le rendu
    - Monitorer les performances et adapter la résolution si FPS < 10
    - _Requirements: 2.6, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 7.4 Écrire les tests unitaires pour le hook
    - Tester l'initialisation de la caméra
    - Tester la gestion des erreurs de permission
    - Tester le nettoyage des ressources
    - Tester la pause sur onglet inactif
    - _Requirements: 1.1, 1.4, 1.5, 2.6, 8.2_

  - [ ]* 7.5 Écrire les tests de propriétés pour le hook
    - **Property 1: Libération complète des ressources**
    - **Property 2: Format des landmarks détectés**
    - **Property 3: Sélection de la main par confiance**
    - **Property 15: Filtrage par score de confiance**
    - **Property 18: Adaptation aux résolutions**
    - **Validates: Requirements 1.4, 2.1, 2.5, 7.6, 8.2, 8.8**

- [ ] 8. Checkpoint - Vérifier l'intégration MediaPipe
  - Tester le hook avec une vraie webcam
  - Vérifier que les landmarks sont détectés et dessinés
  - Vérifier que les gestes sont identifiés correctement
  - Vérifier les optimisations de performance
  - Demander à l'utilisateur si des questions se posent

- [ ] 9. Créer le composant principal HandGestureControl
  - [ ] 9.1 Créer le fichier `src/components/HandGestureControl.tsx`
    - Définir les props et l'état du composant
    - Utiliser le hook `useHandGesture`
    - Créer une instance de `GestureValidator`
    - Créer une instance de `RecommendationService`
    - Gérer la sélection automatique de la recommandation active
    - _Requirements: 1.1, 5.5, 5.6_

  - [ ] 9.2 Implémenter la logique de validation des gestes
    - Intégrer le `GestureValidator` avec les gestes détectés
    - Mettre à jour la progression visuelle (0-100%)
    - Déclencher l'action API quand un geste est validé
    - Gérer le cooldown après validation
    - Afficher les messages d'instabilité si détectée
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5_

  - [ ] 9.3 Implémenter les actions sur gestes validés
    - Appeler `recommendationService.respondToRecommendation()` pour THUMBS_UP (ACCEPTED)
    - Appeler `recommendationService.respondToRecommendation()` pour THUMBS_DOWN (REJECTED)
    - Mettre à jour l'UI après succès (confirmation, retirer de la liste)
    - Gérer les erreurs API et afficher les messages appropriés
    - Ignorer les gestes si aucune recommandation active
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 9.4 Écrire les tests unitaires pour la logique du composant
    - Tester la sélection automatique de recommandation
    - Tester la validation de geste et l'appel API
    - Tester la gestion des erreurs API
    - Tester le comportement avec liste vide
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 9.5 Écrire les tests de propriétés pour le composant
    - **Property 12: Sélection automatique de recommandation**
    - **Validates: Requirements 5.5**

- [ ] 10. Implémenter l'interface utilisateur du composant
  - [ ] 10.1 Créer la structure HTML/JSX du composant
    - Bouton toggle "Activer/Désactiver la caméra"
    - Élément `<video>` pour le flux webcam
    - Élément `<canvas>` overlay pour les landmarks
    - Zone d'affichage du geste détecté avec icône
    - Zone d'affichage du statut système
    - Liste des recommandations avec mise en évidence de l'active
    - Boutons alternatifs "Accepter" et "Refuser"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1_

  - [ ] 10.2 Implémenter le style CSS
    - Créer le fichier `src/components/HandGestureControl.css`
    - Styliser le layout responsive (minimum 1024px)
    - Positionner le canvas en overlay sur la vidéo
    - Styliser les icônes de gestes
    - Styliser la barre de progression de stabilité
    - Styliser les messages d'erreur et de statut
    - Mettre en évidence la recommandation active
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.6_

  - [ ] 10.3 Implémenter l'affichage dynamique du statut
    - Afficher "En attente" quand idle
    - Afficher "Geste détecté: [GESTE]" avec icône quand un geste est détecté
    - Afficher "Validation en cours..." avec barre de progression
    - Afficher "Action effectuée" après succès API
    - Afficher "Cooldown actif" pendant le cooldown
    - Afficher les messages d'erreur avec style approprié
    - _Requirements: 6.3, 6.4_

  - [ ]* 10.4 Écrire les tests unitaires pour l'UI
    - Tester l'affichage du bouton toggle
    - Tester l'affichage de la vidéo et du canvas
    - Tester l'affichage des gestes et du statut
    - Tester l'affichage de la liste de recommandations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 10.5 Écrire le test de propriété pour la cohérence UI
    - **Property 17: Cohérence de l'état UI**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [ ] 11. Implémenter l'accessibilité
  - [ ] 11.1 Ajouter les attributs ARIA
    - Ajouter `aria-label` sur tous les boutons
    - Ajouter `aria-live="polite"` sur la zone de statut
    - Ajouter `role="status"` sur les messages
    - Ajouter `aria-current="true"` sur la recommandation active
    - Ajouter `aria-busy` pendant le traitement
    - _Requirements: 10.4_

  - [ ] 11.2 Implémenter la navigation clavier
    - Rendre tous les boutons focusables avec `tabIndex`
    - Gérer les événements `onKeyDown` pour Enter et Space
    - Permettre la navigation Tab entre les recommandations
    - Permettre l'activation des boutons alternatifs au clavier
    - _Requirements: 10.3_

  - [ ] 11.3 Ajouter les tooltips explicatifs
    - Tooltip sur le bouton caméra expliquant son rôle
    - Tooltip sur chaque icône de geste expliquant l'action
    - Tooltip sur les boutons alternatifs
    - Utiliser `title` ou un composant tooltip personnalisé
    - _Requirements: 10.5_

  - [ ]* 11.4 Écrire les tests unitaires pour l'accessibilité
    - Tester la présence des attributs ARIA
    - Tester la navigation clavier
    - Tester l'activation des boutons au clavier
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ]* 11.5 Écrire les tests de propriétés pour l'accessibilité
    - **Property 19: Accessibilité clavier**
    - **Property 20: Présence des attributs ARIA**
    - **Property 21: Responsive design**
    - **Validates: Requirements 10.3, 10.4, 10.6**

- [ ] 12. Implémenter les boutons alternatifs (fallback)
  - [ ] 12.1 Ajouter la logique des boutons "Accepter" et "Refuser"
    - Afficher les boutons en permanence comme alternative
    - Rendre les boutons cliquables même quand la caméra est active
    - Appeler la même logique API que les gestes
    - Désactiver les boutons pendant le cooldown
    - Désactiver les boutons si aucune recommandation active
    - _Requirements: 10.1, 10.2_

  - [ ]* 12.2 Écrire les tests unitaires pour les boutons alternatifs
    - Tester le clic sur "Accepter" appelle l'API avec ACCEPTED
    - Tester le clic sur "Refuser" appelle l'API avec REJECTED
    - Tester que les boutons sont désactivés pendant le cooldown
    - Tester que les boutons sont désactivés si pas de recommandation
    - _Requirements: 10.1, 10.2_

- [ ] 13. Checkpoint - Vérifier l'intégration complète
  - Tester le flux complet: activer caméra → détecter geste → valider → appel API
  - Tester les boutons alternatifs
  - Tester l'accessibilité clavier
  - Tester la gestion d'erreur (permission refusée, API en échec)
  - Vérifier les performances (FPS, temps de traitement)
  - Demander à l'utilisateur si des questions se posent

- [ ] 14. Implémenter la gestion d'erreur complète
  - [ ] 14.1 Gérer les erreurs de webcam
    - Afficher un message clair si permission refusée
    - Afficher un message si webcam non disponible
    - Afficher un message si webcam déjà utilisée
    - Proposer des instructions de dépannage
    - _Requirements: 1.5, 7.1_

  - [ ] 14.2 Gérer les erreurs MediaPipe
    - Afficher un message si échec d'initialisation
    - Proposer un bouton "Réessayer"
    - Vérifier la connexion internet (modèles chargés depuis CDN)
    - _Requirements: 7.2_

  - [ ] 14.3 Gérer les erreurs de détection
    - Afficher "Aucune main détectée" si pas de landmarks
    - Afficher "Main détectée avec faible confiance" si score < 0.7
    - Afficher "Détection instable" si changements fréquents
    - _Requirements: 2.3, 7.5, 7.6_

  - [ ]* 14.4 Écrire les tests unitaires pour la gestion d'erreur
    - Tester tous les messages d'erreur
    - Tester le bouton "Réessayer"
    - Tester les cas limites (pas de main, confiance faible)
    - _Requirements: 1.5, 2.3, 7.1, 7.2, 7.5, 7.6_

- [ ] 15. Optimisations finales et polish
  - [ ] 15.1 Optimiser les performances
    - Mémoiser les calculs coûteux avec `useMemo`
    - Mémoiser les callbacks avec `useCallback`
    - Vérifier qu'il n'y a pas de re-renders inutiles
    - Tester sur différentes configurations (laptop, desktop)
    - _Requirements: 8.1, 8.3, 8.7, 8.8_

  - [ ] 15.2 Ajouter les animations et transitions
    - Animer la barre de progression de stabilité
    - Animer l'apparition des messages de confirmation
    - Transition smooth pour le changement de recommandation active
    - Feedback visuel sur les boutons au hover/focus

  - [ ] 15.3 Tester la compatibilité navigateurs
    - Tester sur Chrome 90+
    - Tester sur Firefox 88+
    - Tester sur Edge 90+
    - Tester sur Safari 14+ (vérifier webcam)
    - _Requirements: 10.7_

- [ ] 16. Tests d'intégration end-to-end
  - [ ]* 16.1 Écrire les tests E2E pour le flux complet d'acceptation
    - Activer la caméra (mocker MediaPipe)
    - Simuler la détection d'un geste THUMBS_UP
    - Maintenir le geste pendant 1 seconde
    - Vérifier l'appel API avec ACCEPTED
    - Vérifier la mise à jour de l'UI
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.4, 5.1, 5.3_

  - [ ]* 16.2 Écrire les tests E2E pour le flux complet de refus
    - Similaire à 16.1 avec THUMBS_DOWN et REJECTED
    - _Requirements: 1.1, 1.2, 1.3, 3.2, 4.4, 5.2, 5.3_

  - [ ]* 16.3 Écrire les tests E2E pour la gestion d'erreur
    - Simuler une erreur API 401
    - Vérifier la tentative de refresh token
    - Vérifier la redirection vers login si échec
    - _Requirements: 7.4_

  - [ ]* 16.4 Écrire les tests E2E pour le fallback
    - Désactiver la caméra
    - Utiliser les boutons cliquables
    - Vérifier que l'API est appelée correctement
    - _Requirements: 10.1, 10.2_

- [ ] 17. Documentation et finalisation
  - [ ] 17.1 Créer le fichier README pour le composant
    - Documenter l'utilisation du composant
    - Lister les props requises
    - Donner des exemples d'intégration
    - Documenter les dépendances

  - [ ] 17.2 Ajouter des commentaires JSDoc
    - Documenter toutes les fonctions publiques
    - Documenter les interfaces et types
    - Ajouter des exemples d'utilisation dans les commentaires

  - [ ] 17.3 Vérifier la couverture de tests
    - Exécuter le rapport de couverture
    - Vérifier que la couverture est > 80% pour les lignes
    - Vérifier que toutes les propriétés ont un test
    - Compléter les tests manquants si nécessaire

- [ ] 18. Checkpoint final - Validation complète
  - Exécuter tous les tests (unitaires + propriétés + E2E)
  - Vérifier les performances en conditions réelles
  - Tester avec de vraies recommandations du backend
  - Vérifier l'accessibilité avec un lecteur d'écran
  - Demander à l'utilisateur de valider le système complet

## Notes

- Les tâches marquées avec `*` sont optionnelles et concernent principalement les tests
- Chaque checkpoint permet de valider le travail avant de continuer
- Les tests de propriétés utilisent `fast-check` avec minimum 100 itérations
- Tous les tests de propriétés doivent référencer leur numéro de propriété du design
- Le système n'effectue AUCUNE modification backend - utilise uniquement l'endpoint existant
- L'implémentation est 100% frontend (React + TypeScript)
