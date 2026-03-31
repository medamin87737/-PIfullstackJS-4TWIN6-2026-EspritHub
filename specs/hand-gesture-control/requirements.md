# Document de Requirements - Hand Gesture Control

## Introduction

Le système Hand Gesture Control permet aux employés de répondre aux recommandations d'activités RH en utilisant des gestes de la main détectés par webcam via MediaPipe. Le système utilise l'endpoint backend existant `/api/recommendations/respond` sans nécessiter aucune modification de la base de données ou du backend.

## Glossaire

- **MediaPipe_Hands**: Bibliothèque de détection de main en temps réel qui fournit 21 landmarks (points de repère) de la main
- **Landmark**: Point de repère 3D sur la main (coordonnées x, y, z normalisées entre 0 et 1)
- **Gesture_Detector**: Module qui analyse les landmarks pour identifier un geste spécifique
- **Hand_Gesture_Control_Component**: Composant React principal qui gère la webcam, la détection et l'affichage
- **Recommendation_API**: Endpoint backend existant POST /api/recommendations/respond
- **Cooldown_Period**: Période d'attente après une action pour éviter les déclenchements multiples
- **Gesture_Stability_Timer**: Délai de validation pour s'assurer qu'un geste est maintenu avant déclenchement
- **Canvas_Overlay**: Élément canvas superposé à la vidéo pour dessiner les landmarks
- **Normalized_Distance**: Distance euclidienne entre deux landmarks, normalisée par la distance wrist-to-middle_finger_mcp pour s'adapter à toutes les tailles de main
- **Reference_Distance**: Distance entre le landmark 0 (wrist) et le landmark 9 (middle_finger_mcp) utilisée comme référence pour normaliser les mesures
- **Confidence_Score**: Score de confiance de MediaPipe pour la détection de la main (entre 0 et 1)
- **Active_Recommendation**: Recommandation actuellement sélectionnée pour recevoir une réponse via geste

## Requirements

### Requirement 1: Initialisation de la Webcam et MediaPipe

**User Story:** En tant qu'employé, je veux activer ma webcam pour que le système puisse détecter mes gestes de la main.

#### Acceptance Criteria

1. WHEN l'utilisateur clique sur le bouton "Activer la caméra", THE Hand_Gesture_Control_Component SHALL demander l'autorisation d'accès à la webcam
2. WHEN l'autorisation est accordée, THE Hand_Gesture_Control_Component SHALL initialiser MediaPipe_Hands avec une confiance minimale de détection de 0.7
3. WHEN MediaPipe_Hands est initialisé, THE Hand_Gesture_Control_Component SHALL afficher le flux vidéo dans un élément video HTML
4. WHEN l'utilisateur clique sur "Désactiver la caméra", THE Hand_Gesture_Control_Component SHALL arrêter le flux vidéo et libérer les ressources
5. IF l'autorisation est refusée, THEN THE Hand_Gesture_Control_Component SHALL afficher un message d'erreur explicite

### Requirement 2: Détection des Landmarks de la Main

**User Story:** En tant que système, je veux détecter les 21 landmarks de la main en temps réel, afin de pouvoir identifier les gestes effectués.

#### Acceptance Criteria

1. WHEN une main est visible dans le flux vidéo, THE MediaPipe_Hands SHALL détecter et retourner les 21 landmarks avec leurs coordonnées (x, y, z) et un Confidence_Score
2. WHEN les landmarks sont détectés, THE Hand_Gesture_Control_Component SHALL dessiner les points et connexions sur le Canvas_Overlay
3. WHEN aucune main n'est détectée, THE Hand_Gesture_Control_Component SHALL afficher "Aucune main détectée"
4. WHILE la caméra est active, THE Hand_Gesture_Control_Component SHALL traiter les frames à un minimum de 15 FPS
5. WHEN plusieurs mains sont détectées, THE Gesture_Detector SHALL analyser uniquement la main avec le Confidence_Score le plus élevé
6. WHEN l'onglet du navigateur n'est pas actif, THE Hand_Gesture_Control_Component SHALL mettre en pause le traitement des frames pour économiser les ressources

### Requirement 3: Identification des Gestes

**User Story:** En tant qu'employé, je veux que le système reconnaisse mes gestes de la main (pouce levé, pouce baissé, main ouverte, poing fermé), afin de pouvoir interagir avec les recommandations.

#### Acceptance Criteria

1. WHEN le pouce est levé (landmark 4.y < landmark 2.y ET landmark 4.x proche de landmark 2.x ET autres doigts fermés), THE Gesture_Detector SHALL identifier le geste comme THUMBS_UP, indépendamment de l'orientation de la caméra
2. WHEN le pouce est baissé (landmark 4.y > landmark 2.y ET landmark 4.x proche de landmark 2.x ET autres doigts fermés), THE Gesture_Detector SHALL identifier le geste comme THUMBS_DOWN, indépendamment de l'orientation de la caméra
3. WHEN tous les doigts sont étendus (Normalized_Distance entre tip et mcp > 0.6 * Reference_Distance pour chaque doigt), THE Gesture_Detector SHALL identifier le geste comme OPEN_HAND
4. WHEN tous les doigts sont repliés (Normalized_Distance entre tip et mcp < 0.3 * Reference_Distance pour chaque doigt), THE Gesture_Detector SHALL identifier le geste comme FIST
5. WHEN les landmarks ne correspondent à aucun pattern, THE Gesture_Detector SHALL retourner UNKNOWN
6. THE Gesture_Detector SHALL calculer la Reference_Distance comme la distance euclidienne entre landmark 0 (wrist) et landmark 9 (middle_finger_mcp) pour normaliser toutes les mesures

### Requirement 4: Validation et Stabilité des Gestes

**User Story:** En tant qu'employé, je veux que mes gestes soient validés uniquement s'ils sont maintenus pendant une seconde, afin d'éviter les déclenchements accidentels.

#### Acceptance Criteria

1. WHEN un geste est détecté, THE Hand_Gesture_Control_Component SHALL démarrer le Gesture_Stability_Timer de 1000ms
2. WHILE le même geste est maintenu pendant 1000ms, THE Hand_Gesture_Control_Component SHALL afficher un indicateur de progression visuel
3. WHEN le geste change avant la fin du timer, THE Hand_Gesture_Control_Component SHALL réinitialiser le Gesture_Stability_Timer
4. WHEN le timer atteint 1000ms avec le même geste, THE Hand_Gesture_Control_Component SHALL valider le geste et déclencher l'action associée
5. WHEN une action est déclenchée, THE Hand_Gesture_Control_Component SHALL activer un Cooldown_Period de 2000ms pendant lequel aucun nouveau geste ne peut être validé

### Requirement 5: Réponse aux Recommandations via Gestes

**User Story:** En tant qu'employé, je veux accepter une recommandation avec un pouce levé et la refuser avec un pouce baissé, afin de répondre rapidement sans utiliser le clavier ou la souris.

#### Acceptance Criteria

1. WHEN le geste THUMBS_UP est validé ET une Active_Recommendation existe, THE Hand_Gesture_Control_Component SHALL envoyer une requête POST à Recommendation_API avec response: 'ACCEPTED'
2. WHEN le geste THUMBS_DOWN est validé ET une Active_Recommendation existe, THE Hand_Gesture_Control_Component SHALL envoyer une requête POST à Recommendation_API avec response: 'REJECTED'
3. WHEN la requête API réussit, THE Hand_Gesture_Control_Component SHALL afficher un message de confirmation et retirer la recommandation de la liste
4. IF la requête API échoue, THEN THE Hand_Gesture_Control_Component SHALL afficher un message d'erreur et permettre une nouvelle tentative
5. WHEN aucune Active_Recommendation n'existe, THE Hand_Gesture_Control_Component SHALL sélectionner automatiquement la première recommandation en attente comme Active_Recommendation
6. WHEN la liste de recommandations est vide, THE Hand_Gesture_Control_Component SHALL ignorer les gestes THUMBS_UP et THUMBS_DOWN et afficher "Aucune recommandation en attente"

### Requirement 6: Affichage de l'Interface Utilisateur

**User Story:** En tant qu'employé, je veux voir le statut de détection, le geste actuel et les recommandations en attente, afin de comprendre l'état du système.

#### Acceptance Criteria

1. THE Hand_Gesture_Control_Component SHALL afficher un bouton toggle pour activer/désactiver la caméra
2. WHEN la caméra est active, THE Hand_Gesture_Control_Component SHALL afficher le flux vidéo avec le Canvas_Overlay superposé
3. THE Hand_Gesture_Control_Component SHALL afficher le geste actuellement détecté avec une icône visuelle
4. THE Hand_Gesture_Control_Component SHALL afficher le statut du système ("En attente", "Geste détecté", "Validation en cours", "Action effectuée")
5. THE Hand_Gesture_Control_Component SHALL afficher la liste des recommandations en attente avec la recommandation actuellement sélectionnée mise en évidence

### Requirement 7: Gestion des Erreurs et Cas Limites

**User Story:** En tant qu'employé, je veux que le système gère gracieusement les erreurs (caméra indisponible, API en échec, conditions de faible luminosité), afin d'avoir une expérience utilisateur fiable.

#### Acceptance Criteria

1. IF la webcam n'est pas disponible, THEN THE Hand_Gesture_Control_Component SHALL afficher un message d'erreur explicite avec des instructions de dépannage
2. IF MediaPipe_Hands échoue à s'initialiser, THEN THE Hand_Gesture_Control_Component SHALL afficher un message d'erreur et proposer de réessayer
3. WHEN la connexion réseau échoue lors d'un appel API, THE Hand_Gesture_Control_Component SHALL afficher un message d'erreur et permettre une nouvelle tentative
4. WHEN le token JWT est expiré (erreur 401), THE Hand_Gesture_Control_Component SHALL tenter un refresh du token si disponible, sinon rediriger vers la page de connexion
5. WHEN la détection est instable (geste change plus de 3 fois en 2 secondes), THE Hand_Gesture_Control_Component SHALL afficher un message suggérant de stabiliser la main
6. WHEN le Confidence_Score est inférieur à 0.7, THE Hand_Gesture_Control_Component SHALL ignorer la détection et afficher "Main détectée avec faible confiance"

### Requirement 8: Performance et Optimisation

**User Story:** En tant qu'employé, je veux que le système soit réactif et n'impacte pas les performances de mon navigateur, afin d'avoir une expérience fluide.

#### Acceptance Criteria

1. THE Hand_Gesture_Control_Component SHALL traiter les frames vidéo à un minimum de 15 FPS sur des configurations standards
2. WHEN le composant est démonté, THE Hand_Gesture_Control_Component SHALL libérer toutes les ressources (webcam, MediaPipe, timers, event listeners)
3. THE Gesture_Detector SHALL calculer l'identification d'un geste en moins de 50ms
4. THE Hand_Gesture_Control_Component SHALL utiliser requestAnimationFrame pour le rendu du Canvas_Overlay
5. WHEN la caméra est désactivée, THE Hand_Gesture_Control_Component SHALL arrêter immédiatement le traitement des frames
6. WHEN l'onglet du navigateur n'est pas actif (document.hidden === true), THE Hand_Gesture_Control_Component SHALL réduire le FPS à 5 pour économiser les ressources
7. WHEN les performances sont dégradées (FPS < 10), THE Hand_Gesture_Control_Component SHALL réduire automatiquement la résolution de traitement et afficher un avertissement
8. THE Hand_Gesture_Control_Component SHALL s'adapter aux différentes résolutions de webcam (minimum 640x480, optimal 1280x720)

### Requirement 9: Intégration avec l'Endpoint Existant

**User Story:** En tant que développeur, je veux utiliser l'endpoint backend existant sans modification, afin de respecter l'architecture actuelle du système.

#### Acceptance Criteria

1. THE Hand_Gesture_Control_Component SHALL envoyer les requêtes à POST /api/recommendations/respond avec le format exact: { recommendationId: string, response: 'ACCEPTED' | 'REJECTED', justification?: string }
2. THE Hand_Gesture_Control_Component SHALL inclure le token JWT dans le header Authorization: Bearer <token>
3. THE Hand_Gesture_Control_Component SHALL utiliser le recommendationId de la recommandation actuellement sélectionnée
4. THE Hand_Gesture_Control_Component SHALL gérer les codes de réponse HTTP (200: succès, 401: non autorisé, 404: recommandation non trouvée, 500: erreur serveur)
5. THE Hand_Gesture_Control_Component SHALL ne jamais modifier ou créer de nouveaux endpoints backend

### Requirement 10: Accessibilité et Alternatives

**User Story:** En tant qu'employé, je veux pouvoir utiliser le système même si la détection de gestes ne fonctionne pas, afin d'avoir une solution de secours.

#### Acceptance Criteria

1. THE Hand_Gesture_Control_Component SHALL fournir des boutons cliquables "Accepter" et "Refuser" comme alternative aux gestes
2. WHEN la caméra est désactivée, THE Hand_Gesture_Control_Component SHALL permettre l'utilisation des boutons traditionnels
3. THE Hand_Gesture_Control_Component SHALL être utilisable au clavier (navigation par Tab, activation par Enter/Space)
4. THE Hand_Gesture_Control_Component SHALL fournir des attributs ARIA pour les lecteurs d'écran
5. THE Hand_Gesture_Control_Component SHALL afficher des tooltips explicatifs sur les gestes disponibles
6. THE Hand_Gesture_Control_Component SHALL être responsive et s'adapter aux écrans desktop et laptop (minimum 1024px de largeur)
7. THE Hand_Gesture_Control_Component SHALL fonctionner sur les navigateurs modernes (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
