# Document de Design - Hand Gesture Control

## Overview

Le système Hand Gesture Control est une interface de contrôle gestuel basée sur MediaPipe Hands qui permet aux employés de répondre aux recommandations d'activités RH en utilisant des gestes de la main détectés par webcam. Le système est conçu comme une couche frontend pure qui s'intègre avec l'endpoint backend existant `/api/recommendations/respond` sans nécessiter aucune modification du backend ou de la base de données.

### Objectifs de Design

1. **Détection robuste**: Algorithmes de détection de gestes fiables et indépendants de l'orientation
2. **Performance optimale**: Traitement en temps réel avec gestion intelligente des ressources
3. **Expérience utilisateur fluide**: Feedback visuel clair et validation progressive des gestes
4. **Intégration transparente**: Utilisation de l'API existante sans modification backend
5. **Accessibilité**: Alternatives clavier/souris et support des lecteurs d'écran

## Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                   HandGestureControl Component               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Camera     │  │   Gesture    │  │     UI       │      │
│  │   Manager    │→ │   Detector   │→ │   Display    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                  ↓                  ↓              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  MediaPipe   │  │   Gesture    │  │   Canvas     │      │
│  │    Hands     │  │  Validation  │  │   Overlay    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           ↓                                  │
│                  ┌──────────────┐                           │
│                  │ Recommendation│                           │
│                  │    Service    │                           │
│                  └──────────────┘                           │
│                           ↓                                  │
│                  POST /api/recommendations/respond           │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Capture vidéo**: Webcam → MediaPipe Camera Utils → Video Element
2. **Détection**: Video Frame → MediaPipe Hands → 21 Landmarks + Confidence Score
3. **Analyse**: Landmarks → Gesture Detector → Gesture Type (THUMBS_UP, THUMBS_DOWN, etc.)
4. **Validation**: Gesture Type → Stability Timer (1s) → Validated Gesture
5. **Action**: Validated Gesture → Recommendation Service → API Call → UI Update

## Components and Interfaces

### 1. HandGestureControl Component (React)

Composant principal qui orchestre tous les sous-modules.

**Props:**
```typescript
interface HandGestureControlProps {
  recommendations: Recommendation[];
  onRecommendationResponse: (id: string, response: 'ACCEPTED' | 'REJECTED') => void;
  authToken: string;
  className?: string;
}
```

**State:**
```typescript
interface HandGestureControlState {
  isCameraActive: boolean;
  currentGesture: GestureType | null;
  gestureProgress: number; // 0-100 for stability timer
  status: 'idle' | 'detecting' | 'validating' | 'processing' | 'cooldown' | 'error';
  activeRecommendation: Recommendation | null;
  error: string | null;
  fps: number;
  confidenceScore: number;
}
```

**Responsabilités:**
- Gérer le cycle de vie de la caméra et MediaPipe
- Coordonner la détection et la validation des gestes
- Afficher l'UI et le feedback visuel
- Gérer les appels API vers le backend

### 2. useHandGesture Hook

Hook personnalisé qui encapsule la logique MediaPipe et la détection de gestes.

**Interface:**
```typescript
interface UseHandGestureReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  currentGesture: GestureType | null;
  landmarks: NormalizedLandmark[] | null;
  confidenceScore: number;
  fps: number;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

function useHandGesture(options: {
  onGestureDetected: (gesture: GestureType) => void;
  minConfidence: number;
}): UseHandGestureReturn
```

**Responsabilités:**
- Initialiser et gérer MediaPipe Hands
- Traiter les frames vidéo en temps réel
- Détecter les landmarks et calculer le score de confiance
- Appeler le Gesture Detector
- Dessiner les landmarks sur le canvas
- Gérer les optimisations de performance (pause si onglet inactif, FPS adaptatif)

### 3. Gesture Detector Module

Module pur (sans état) qui analyse les landmarks pour identifier les gestes.

**Interface:**
```typescript
interface NormalizedLandmark {
  x: number; // 0-1
  y: number; // 0-1
  z: number; // profondeur relative
}

type GestureType = 'THUMBS_UP' | 'THUMBS_DOWN' | 'OPEN_HAND' | 'FIST' | 'UNKNOWN';

interface GestureDetectionResult {
  gesture: GestureType;
  confidence: number; // 0-1
}

function detectGesture(landmarks: NormalizedLandmark[]): GestureDetectionResult
```

**Algorithmes de détection:**

**A. Calcul de la distance de référence:**
```typescript
function calculateReferenceDistance(landmarks: NormalizedLandmark[]): number {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  return euclideanDistance(wrist, middleMcp);
}
```

**B. Distance normalisée:**
```typescript
function normalizedDistance(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  referenceDistance: number
): number {
  return euclideanDistance(p1, p2) / referenceDistance;
}
```

**C. Détection THUMBS_UP:**
```typescript
function isThumbsUp(landmarks: NormalizedLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const indexMcp = landmarks[5];
  
  // Pouce étendu vers le haut
  const thumbExtended = thumbTip.y < thumbIp.y && thumbIp.y < thumbMcp.y;
  
  // Pouce aligné verticalement (tolérance sur x)
  const thumbVertical = Math.abs(thumbTip.x - thumbMcp.x) < 0.1;
  
  // Autres doigts fermés
  const otherFingersClosed = areFingersClosed([5, 9, 13, 17], landmarks);
  
  return thumbExtended && thumbVertical && otherFingersClosed;
}
```

**D. Détection THUMBS_DOWN:**
```typescript
function isThumbsDown(landmarks: NormalizedLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  
  // Pouce étendu vers le bas
  const thumbExtended = thumbTip.y > thumbIp.y && thumbIp.y > thumbMcp.y;
  
  // Pouce aligné verticalement (tolérance sur x)
  const thumbVertical = Math.abs(thumbTip.x - thumbMcp.x) < 0.1;
  
  // Autres doigts fermés
  const otherFingersClosed = areFingersClosed([5, 9, 13, 17], landmarks);
  
  return thumbExtended && thumbVertical && otherFingersClosed;
}
```

**E. Détection OPEN_HAND:**
```typescript
function isOpenHand(landmarks: NormalizedLandmark[]): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  const fingerIndices = [
    [5, 8],   // Index
    [9, 12],  // Middle
    [13, 16], // Ring
    [17, 20]  // Pinky
  ];
  
  return fingerIndices.every(([mcp, tip]) => {
    const distance = normalizedDistance(landmarks[mcp], landmarks[tip], refDistance);
    return distance > 0.6; // Doigt étendu
  });
}
```

**F. Détection FIST:**
```typescript
function isFist(landmarks: NormalizedLandmark[]): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  const fingerIndices = [
    [5, 8],   // Index
    [9, 12],  // Middle
    [13, 16], // Ring
    [17, 20]  // Pinky
  ];
  
  return fingerIndices.every(([mcp, tip]) => {
    const distance = normalizedDistance(landmarks[mcp], landmarks[tip], refDistance);
    return distance < 0.3; // Doigt replié
  });
}
```

**G. Fonction utilitaire:**
```typescript
function areFingersClosed(mcpIndices: number[], landmarks: NormalizedLandmark[]): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  
  return mcpIndices.every(mcpIndex => {
    const tipIndex = mcpIndex + 3; // Tip est toujours +3 du MCP
    const distance = normalizedDistance(
      landmarks[mcpIndex],
      landmarks[tipIndex],
      refDistance
    );
    return distance < 0.3;
  });
}
```

### 4. Gesture Validation Module

Module qui gère la stabilité des gestes et le cooldown.

**Interface:**
```typescript
interface GestureValidationState {
  currentGesture: GestureType | null;
  startTime: number | null;
  isInCooldown: boolean;
  cooldownEndTime: number | null;
  gestureChangeCount: number;
  lastChangeTime: number;
}

class GestureValidator {
  private state: GestureValidationState;
  private readonly STABILITY_DURATION = 1000; // 1 seconde
  private readonly COOLDOWN_DURATION = 2000; // 2 secondes
  private readonly INSTABILITY_THRESHOLD = 3; // 3 changements
  private readonly INSTABILITY_WINDOW = 2000; // en 2 secondes
  
  update(gesture: GestureType): {
    isValidated: boolean;
    progress: number; // 0-100
    isUnstable: boolean;
  }
  
  reset(): void
  isInCooldown(): boolean
}
```

**Logique de validation:**
1. Si en cooldown, retourner `isValidated: false`
2. Si le geste change, réinitialiser le timer et incrémenter `gestureChangeCount`
3. Si `gestureChangeCount > 3` en 2 secondes, marquer comme instable
4. Si le geste est stable pendant 1 seconde, valider et démarrer le cooldown
5. Calculer le progrès: `(Date.now() - startTime) / STABILITY_DURATION * 100`

### 5. Recommendation Service

Service qui gère les appels API vers le backend.

**Interface:**
```typescript
interface RecommendationResponse {
  recommendationId: string;
  response: 'ACCEPTED' | 'REJECTED';
  justification?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class RecommendationService {
  constructor(private authToken: string) {}
  
  async respondToRecommendation(
    recommendationId: string,
    response: 'ACCEPTED' | 'REJECTED',
    justification?: string
  ): Promise<ApiResponse>
  
  private async refreshTokenIfNeeded(): Promise<boolean>
}
```

**Implémentation:**
```typescript
async respondToRecommendation(
  recommendationId: string,
  response: 'ACCEPTED' | 'REJECTED',
  justification?: string
): Promise<ApiResponse> {
  try {
    const result = await axios.post(
      '/api/recommendations/respond',
      { recommendationId, response, justification },
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { success: true, message: result.data.message };
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expiré, tenter refresh
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) {
        // Réessayer la requête
        return this.respondToRecommendation(recommendationId, response, justification);
      }
      // Rediriger vers login
      window.location.href = '/login';
      return { success: false, error: 'Session expirée' };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || 'Erreur réseau'
    };
  }
}
```

### 6. Canvas Renderer

Module qui dessine les landmarks sur le canvas overlay.

**Interface:**
```typescript
interface RenderOptions {
  drawConnections: boolean;
  drawLandmarks: boolean;
  landmarkColor: string;
  connectionColor: string;
  landmarkRadius: number;
}

function renderHand(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  options: RenderOptions
): void
```

**Connexions des landmarks:**
```typescript
const HAND_CONNECTIONS = [
  // Pouce
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Majeur
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Annulaire
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Auriculaire
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Paume
  [5, 9], [9, 13], [13, 17]
];
```

## Data Models

### Recommendation Model (Frontend)

```typescript
interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: Date;
  expiresAt?: Date;
}
```

### Gesture Event

```typescript
interface GestureEvent {
  type: GestureType;
  timestamp: number;
  confidence: number;
  landmarks: NormalizedLandmark[];
}
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  fps: number;
  averageProcessingTime: number; // ms
  droppedFrames: number;
  lastUpdateTime: number;
}
```

## Correctness Properties

*Une propriété est une caractéristique ou un comportement qui devrait être vrai pour toutes les exécutions valides d'un système - essentiellement, une déclaration formelle sur ce que le système devrait faire. Les propriétés servent de pont entre les spécifications lisibles par l'homme et les garanties de correction vérifiables par machine.*


### Property 1: Libération complète des ressources

*Pour tout* composant HandGestureControl, lorsque le composant est démonté ou la caméra est désactivée, toutes les ressources (webcam stream, MediaPipe instance, timers, event listeners) doivent être libérées sans fuite mémoire.

**Validates: Requirements 1.4, 8.2**

### Property 2: Format des landmarks détectés

*Pour toute* détection de main réussie par MediaPipe, les données retournées doivent contenir exactement 21 landmarks, chacun avec des coordonnées x, y, z normalisées entre 0 et 1, et un score de confiance.

**Validates: Requirements 2.1**

### Property 3: Sélection de la main par confiance

*Pour toute* frame où plusieurs mains sont détectées, le système doit analyser uniquement la main ayant le score de confiance le plus élevé, et ignorer les autres mains.

**Validates: Requirements 2.5**

### Property 4: Rendu des landmarks sur canvas

*Pour tout* ensemble de landmarks détectés, le canvas overlay doit dessiner tous les 21 points et leurs connexions selon la structure anatomique de la main.

**Validates: Requirements 2.2**

### Property 5: Calcul de la distance de référence

*Pour tout* ensemble de landmarks, la distance de référence doit être calculée comme la distance euclidienne entre le landmark 0 (wrist) et le landmark 9 (middle_finger_mcp), permettant une normalisation indépendante de la taille de la main.

**Validates: Requirements 3.6**

### Property 6: Détection des gestes par pattern de landmarks

*Pour tout* ensemble de landmarks correspondant aux patterns définis (pouce levé/baissé avec alignement vertical et autres doigts fermés), le Gesture Detector doit identifier correctement le geste (THUMBS_UP ou THUMBS_DOWN), indépendamment de l'orientation de la caméra.

**Validates: Requirements 3.1, 3.2**

### Property 7: Détection basée sur distances normalisées

*Pour tout* ensemble de landmarks, si tous les doigts ont une distance normalisée tip-to-mcp > 0.6 * Reference_Distance, le geste doit être OPEN_HAND; si toutes les distances sont < 0.3 * Reference_Distance, le geste doit être FIST.

**Validates: Requirements 3.3, 3.4**

### Property 8: Geste inconnu par défaut

*Pour tout* ensemble de landmarks ne correspondant à aucun pattern défini (THUMBS_UP, THUMBS_DOWN, OPEN_HAND, FIST), le Gesture Detector doit retourner UNKNOWN.

**Validates: Requirements 3.5**

### Property 9: Réinitialisation du timer sur changement de geste

*Pour tout* changement de geste détecté avant la fin du Gesture_Stability_Timer, le timer doit être réinitialisé à 0 et le comptage doit recommencer pour le nouveau geste.

**Validates: Requirements 4.3**

### Property 10: Cooldown après validation

*Pour toute* action validée (geste maintenu pendant 1000ms), un cooldown de 2000ms doit être activé pendant lequel aucun nouveau geste ne peut être validé, même s'il est stable.

**Validates: Requirements 4.5**

### Property 11: Progression visuelle de la stabilité

*Pour tout* geste maintenu, la progression affichée doit être proportionnelle au temps écoulé: `progress = (temps_écoulé / 1000) * 100`, variant de 0 à 100.

**Validates: Requirements 4.2**

### Property 12: Sélection automatique de recommandation

*Pour tout* état où aucune Active_Recommendation n'existe et la liste de recommandations n'est pas vide, le système doit automatiquement sélectionner la première recommandation de la liste comme Active_Recommendation.

**Validates: Requirements 5.5**

### Property 13: Format complet de la requête API

*Pour toute* requête envoyée à POST /api/recommendations/respond, la requête doit contenir: (1) le body au format exact `{ recommendationId: string, response: 'ACCEPTED' | 'REJECTED', justification?: string }`, (2) le header `Authorization: Bearer <token>`, et (3) le recommendationId de l'Active_Recommendation.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 14: Gestion des codes de réponse HTTP

*Pour toute* réponse HTTP reçue de l'API, le système doit gérer correctement chaque code: 200 (succès → confirmation), 401 (non autorisé → refresh token ou redirect login), 404 (non trouvé → erreur), 500 (erreur serveur → message d'erreur).

**Validates: Requirements 9.4**

### Property 15: Filtrage par score de confiance

*Pour toute* détection de main avec un Confidence_Score < 0.7, le système doit ignorer la détection et afficher "Main détectée avec faible confiance" au lieu de traiter les landmarks.

**Validates: Requirements 7.6**

### Property 16: Détection d'instabilité

*Pour tout* intervalle de 2 secondes, si le geste change plus de 3 fois, le système doit marquer la détection comme instable et afficher un message suggérant de stabiliser la main.

**Validates: Requirements 7.5**

### Property 17: Cohérence de l'état UI

*Pour tout* état du système (idle, detecting, validating, processing, cooldown, error), l'interface doit afficher de manière cohérente: (1) le geste actuellement détecté avec son icône, (2) le statut correspondant à l'état, et (3) la recommandation active mise en évidence dans la liste.

**Validates: Requirements 6.3, 6.4, 6.5**

### Property 18: Adaptation aux résolutions

*Pour toute* résolution de webcam entre 640x480 (minimum) et 1280x720 (optimal), le système doit s'adapter automatiquement et traiter les frames sans erreur.

**Validates: Requirements 8.8**

### Property 19: Accessibilité clavier

*Pour tout* élément interactif du composant (boutons, recommandations), la navigation au clavier (Tab) et l'activation (Enter/Space) doivent fonctionner correctement.

**Validates: Requirements 10.3**

### Property 20: Présence des attributs ARIA

*Pour tout* élément UI du composant, les attributs ARIA appropriés (aria-label, aria-live, role) doivent être présents pour assurer la compatibilité avec les lecteurs d'écran.

**Validates: Requirements 10.4**

### Property 21: Responsive design

*Pour toute* largeur d'écran ≥ 1024px, le composant doit s'afficher correctement et rester fonctionnel, avec une mise en page adaptée aux écrans desktop et laptop.

**Validates: Requirements 10.6**

## Error Handling

### Stratégie Générale

Le système adopte une approche de gestion d'erreur en couches:

1. **Couche Capture**: Détection des erreurs (webcam, MediaPipe, réseau)
2. **Couche Traitement**: Tentatives de récupération automatique (refresh token, retry)
3. **Couche Présentation**: Messages d'erreur clairs et actions suggérées
4. **Couche Fallback**: Alternatives fonctionnelles (boutons cliquables)

### Erreurs de Webcam

**Scénarios:**
- Permission refusée par l'utilisateur
- Webcam non disponible (utilisée par une autre app)
- Erreur matérielle

**Gestion:**
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  // ...
} catch (error) {
  if (error.name === 'NotAllowedError') {
    setError('Permission caméra refusée. Veuillez autoriser l\'accès dans les paramètres du navigateur.');
  } else if (error.name === 'NotFoundError') {
    setError('Aucune webcam détectée. Veuillez connecter une caméra.');
  } else if (error.name === 'NotReadableError') {
    setError('Webcam déjà utilisée par une autre application. Veuillez la fermer.');
  } else {
    setError('Erreur d\'accès à la webcam. Veuillez réessayer.');
  }
  // Afficher les boutons alternatifs
  setShowFallbackButtons(true);
}
```

### Erreurs MediaPipe

**Scénarios:**
- Échec de chargement des modèles
- Erreur d'initialisation
- Erreur de traitement

**Gestion:**
```typescript
try {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  await hands.initialize();
} catch (error) {
  setError('Échec d\'initialisation de MediaPipe. Vérifiez votre connexion internet.');
  setShowRetryButton(true);
}
```

### Erreurs Réseau et API

**Scénarios:**
- Perte de connexion
- Token JWT expiré
- Erreur serveur (500)
- Recommandation non trouvée (404)

**Gestion:**
```typescript
async function handleApiError(error: AxiosError): Promise<void> {
  if (!error.response) {
    // Erreur réseau
    setError('Connexion réseau perdue. Vérifiez votre connexion.');
    setShowRetryButton(true);
    return;
  }
  
  switch (error.response.status) {
    case 401:
      // Token expiré
      const refreshed = await attemptTokenRefresh();
      if (!refreshed) {
        setError('Session expirée. Redirection vers la connexion...');
        setTimeout(() => window.location.href = '/login', 2000);
      }
      break;
      
    case 404:
      setError('Recommandation non trouvée. Elle a peut-être été supprimée.');
      // Retirer de la liste locale
      removeRecommendationFromList(currentRecommendationId);
      break;
      
    case 500:
      setError('Erreur serveur. Veuillez réessayer dans quelques instants.');
      setShowRetryButton(true);
      break;
      
    default:
      setError('Une erreur est survenue. Veuillez réessayer.');
      setShowRetryButton(true);
  }
}
```

### Erreurs de Performance

**Scénarios:**
- FPS trop bas (< 10)
- Traitement trop lent (> 100ms par frame)
- Mémoire insuffisante

**Gestion:**
```typescript
function monitorPerformance(): void {
  if (currentFps < 10) {
    // Réduire la résolution
    setProcessingResolution('low'); // 320x240
    setWarning('Performances dégradées. Résolution réduite pour améliorer la fluidité.');
  }
  
  if (averageProcessingTime > 100) {
    // Réduire la fréquence de traitement
    setProcessingInterval(200); // Traiter 1 frame sur 2
    setWarning('Traitement ralenti pour économiser les ressources.');
  }
}
```

### Erreurs de Détection

**Scénarios:**
- Confiance faible (< 0.7)
- Détection instable (changements fréquents)
- Aucune main détectée

**Gestion:**
```typescript
function handleDetectionIssues(
  landmarks: NormalizedLandmark[] | null,
  confidence: number,
  gestureHistory: GestureType[]
): void {
  if (!landmarks) {
    setStatus('Aucune main détectée');
    return;
  }
  
  if (confidence < 0.7) {
    setStatus('Main détectée avec faible confiance');
    // Ne pas traiter le geste
    return;
  }
  
  // Vérifier l'instabilité
  const recentChanges = countGestureChanges(gestureHistory, 2000);
  if (recentChanges > 3) {
    setWarning('Détection instable. Maintenez votre main stable.');
    // Augmenter le temps de stabilité requis
    setStabilityDuration(1500);
  }
}
```

## Testing Strategy

### Approche Duale: Unit Tests + Property-Based Tests

Le système utilise une approche de test complémentaire:

- **Unit tests**: Exemples spécifiques, cas limites, intégrations
- **Property tests**: Propriétés universelles, validation sur de nombreux inputs générés

### Configuration Property-Based Testing

**Bibliothèque**: `fast-check` (pour TypeScript/JavaScript)

**Configuration minimale**: 100 itérations par test de propriété

**Format de tag**: `Feature: hand-gesture-control, Property {number}: {property_text}`

### Tests Unitaires

**Catégories de tests unitaires:**

1. **Tests d'intégration UI**
   - Activation/désactivation de la caméra
   - Affichage des messages d'erreur
   - Interaction avec les boutons alternatifs
   - Navigation clavier

2. **Tests de cas limites**
   - Liste de recommandations vide
   - Aucune main détectée
   - Confiance faible (< 0.7)
   - Token JWT expiré

3. **Tests d'erreur**
   - Permission caméra refusée
   - Échec d'initialisation MediaPipe
   - Erreurs réseau (timeout, 500, 404)
   - Erreurs de parsing

4. **Tests de mocks**
   - Mock de MediaPipe Hands
   - Mock des appels API
   - Mock de navigator.mediaDevices
   - Mock de requestAnimationFrame

**Exemple de test unitaire:**
```typescript
describe('HandGestureControl - Camera Activation', () => {
  it('should request camera permission when activate button is clicked', async () => {
    const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;
    
    const { getByText } = render(<HandGestureControl {...props} />);
    const activateButton = getByText('Activer la caméra');
    
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
    });
  });
  
  it('should display error message when permission is denied', async () => {
    const mockGetUserMedia = jest.fn().mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    );
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;
    
    const { getByText } = render(<HandGestureControl {...props} />);
    const activateButton = getByText('Activer la caméra');
    
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(getByText(/Permission caméra refusée/i)).toBeInTheDocument();
    });
  });
});
```

### Tests de Propriétés

**Générateurs personnalisés:**

```typescript
// Générateur de landmarks valides
const landmarkArbitrary = fc.record({
  x: fc.double({ min: 0, max: 1 }),
  y: fc.double({ min: 0, max: 1 }),
  z: fc.double({ min: -0.5, max: 0.5 })
});

const handLandmarksArbitrary = fc.array(landmarkArbitrary, { minLength: 21, maxLength: 21 });

// Générateur de geste THUMBS_UP
const thumbsUpLandmarksArbitrary = fc.record({
  landmarks: handLandmarksArbitrary
}).map(({ landmarks }) => {
  // Forcer le pattern THUMBS_UP
  landmarks[4].y = landmarks[2].y - 0.2; // Pouce levé
  landmarks[4].x = landmarks[2].x + fc.sample(fc.double({ min: -0.05, max: 0.05 }), 1)[0];
  // Fermer les autres doigts
  [8, 12, 16, 20].forEach(tipIndex => {
    const mcpIndex = tipIndex - 3;
    landmarks[tipIndex].y = landmarks[mcpIndex].y + 0.05;
  });
  return landmarks;
});
```

**Exemples de tests de propriétés:**

```typescript
// Feature: hand-gesture-control, Property 5: Calcul de la distance de référence
describe('Property 5: Reference Distance Calculation', () => {
  it('should calculate reference distance as euclidean distance between wrist and middle MCP', () => {
    fc.assert(
      fc.property(handLandmarksArbitrary, (landmarks) => {
        const refDistance = calculateReferenceDistance(landmarks);
        const expectedDistance = euclideanDistance(landmarks[0], landmarks[9]);
        
        expect(refDistance).toBeCloseTo(expectedDistance, 5);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: hand-gesture-control, Property 6: Détection des gestes par pattern
describe('Property 6: Gesture Detection by Pattern', () => {
  it('should detect THUMBS_UP for all landmarks matching thumbs up pattern', () => {
    fc.assert(
      fc.property(thumbsUpLandmarksArbitrary, (landmarks) => {
        const result = detectGesture(landmarks);
        
        expect(result.gesture).toBe('THUMBS_UP');
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: hand-gesture-control, Property 9: Réinitialisation du timer
describe('Property 9: Timer Reset on Gesture Change', () => {
  it('should reset stability timer to 0 whenever gesture changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('THUMBS_UP', 'THUMBS_DOWN', 'OPEN_HAND', 'FIST'), { minLength: 2, maxLength: 10 }),
        (gestureSequence) => {
          const validator = new GestureValidator();
          let previousProgress = 0;
          
          gestureSequence.forEach((gesture, index) => {
            const result = validator.update(gesture);
            
            if (index > 0 && gestureSequence[index] !== gestureSequence[index - 1]) {
              // Le geste a changé, le progrès doit être réinitialisé
              expect(result.progress).toBeLessThan(previousProgress);
            }
            
            previousProgress = result.progress;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hand-gesture-control, Property 13: Format complet de la requête API
describe('Property 13: Complete API Request Format', () => {
  it('should send requests with correct format, headers, and recommendationId', () => {
    fc.assert(
      fc.property(
        fc.record({
          recommendationId: fc.uuid(),
          response: fc.constantFrom('ACCEPTED', 'REJECTED'),
          token: fc.string({ minLength: 20 })
        }),
        async ({ recommendationId, response, token }) => {
          const mockAxios = jest.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } });
          
          const service = new RecommendationService(token);
          await service.respondToRecommendation(recommendationId, response);
          
          expect(mockAxios).toHaveBeenCalledWith(
            '/api/recommendations/respond',
            { recommendationId, response, justification: undefined },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          mockAxios.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: hand-gesture-control, Property 1: Libération complète des ressources
describe('Property 1: Complete Resource Cleanup', () => {
  it('should release all resources when component unmounts or camera is disabled', () => {
    fc.assert(
      fc.property(fc.boolean(), (unmountOrDisable) => {
        const mockStream = {
          getTracks: jest.fn().mockReturnValue([
            { stop: jest.fn() },
            { stop: jest.fn() }
          ])
        };
        const mockHands = {
          close: jest.fn()
        };
        const mockTimers = [setTimeout(() => {}, 1000), setTimeout(() => {}, 2000)];
        
        const cleanup = createCleanupFunction(mockStream, mockHands, mockTimers);
        cleanup();
        
        // Vérifier que toutes les ressources sont libérées
        mockStream.getTracks().forEach(track => {
          expect(track.stop).toHaveBeenCalled();
        });
        expect(mockHands.close).toHaveBeenCalled();
        mockTimers.forEach(timer => {
          expect(clearTimeout).toHaveBeenCalledWith(timer);
        });
      }),
      { numRuns: 100 }
    );
  });
});
```

### Couverture de Tests

**Objectifs de couverture:**
- **Lignes**: > 80%
- **Branches**: > 75%
- **Fonctions**: > 85%
- **Propriétés**: 100% (toutes les propriétés doivent avoir un test)

**Zones critiques nécessitant une couverture maximale:**
- Gesture Detector (détection de gestes)
- Gesture Validator (stabilité et cooldown)
- Recommendation Service (appels API)
- Resource cleanup (libération des ressources)

### Tests d'Intégration

**Scénarios end-to-end:**

1. **Flux complet d'acceptation:**
   - Activer la caméra
   - Détecter une main
   - Faire un geste THUMBS_UP
   - Maintenir pendant 1 seconde
   - Vérifier l'appel API avec 'ACCEPTED'
   - Vérifier la mise à jour de l'UI

2. **Flux complet de refus:**
   - Similaire avec THUMBS_DOWN et 'REJECTED'

3. **Flux de gestion d'erreur:**
   - Simuler une erreur API 401
   - Vérifier la tentative de refresh token
   - Vérifier la redirection vers login si échec

4. **Flux de fallback:**
   - Désactiver la caméra
   - Utiliser les boutons cliquables
   - Vérifier que l'API est appelée correctement

### Tests de Performance

**Métriques à surveiller:**
- FPS moyen (doit être ≥ 15)
- Temps de traitement par frame (doit être < 50ms)
- Utilisation mémoire (pas de fuites)
- Temps de réponse API (< 500ms)

**Outils:**
- Chrome DevTools Performance
- React DevTools Profiler
- Lighthouse (pour l'accessibilité et la performance)

## Notes d'Implémentation

### Ordre d'Implémentation Recommandé

1. **Phase 1: Fondations**
   - Créer les types TypeScript
   - Implémenter le Gesture Detector (fonctions pures)
   - Écrire les tests de propriétés pour le Gesture Detector

2. **Phase 2: Intégration MediaPipe**
   - Créer le hook useHandGesture
   - Intégrer MediaPipe Hands
   - Implémenter le Canvas Renderer
   - Tester avec des données mockées

3. **Phase 3: Validation et Timing**
   - Implémenter le Gesture Validator
   - Ajouter les timers de stabilité et cooldown
   - Tester la logique de validation

4. **Phase 4: API et État**
   - Créer le Recommendation Service
   - Implémenter la gestion d'état du composant principal
   - Ajouter la gestion d'erreur

5. **Phase 5: UI et Accessibilité**
   - Créer le composant HandGestureControl
   - Implémenter l'interface utilisateur
   - Ajouter les boutons alternatifs
   - Implémenter l'accessibilité (ARIA, clavier)

6. **Phase 6: Optimisations**
   - Ajouter les optimisations de performance
   - Implémenter la pause sur onglet inactif
   - Ajouter l'adaptation de résolution

7. **Phase 7: Tests et Validation**
   - Compléter les tests unitaires
   - Compléter les tests de propriétés
   - Tests d'intégration end-to-end
   - Tests de performance

### Dépendances Requises

```json
{
  "dependencies": {
    "@mediapipe/hands": "^0.4.1646424915",
    "@mediapipe/camera_utils": "^0.3.1620248357",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@types/react": "^18.2.0",
    "fast-check": "^3.15.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.0"
  }
}
```

### Considérations de Sécurité

1. **Token JWT**: Stocker dans un contexte React sécurisé, ne jamais exposer dans les logs
2. **HTTPS**: Webcam nécessite HTTPS en production
3. **CORS**: Vérifier que le backend accepte les requêtes du frontend
4. **Validation**: Valider tous les inputs avant envoi à l'API
5. **Rate limiting**: Implémenter un throttling côté client pour éviter les abus

### Considérations de Performance

1. **Lazy loading**: Charger MediaPipe uniquement quand nécessaire
2. **Web Workers**: Envisager d'utiliser un Web Worker pour le traitement des landmarks
3. **Canvas offscreen**: Utiliser OffscreenCanvas si disponible
4. **Memoization**: Mémoiser les calculs coûteux (distances, détections)
5. **Debouncing**: Debouncer les mises à jour d'état non critiques

### Compatibilité Navigateurs

**Support minimum:**
- Chrome 90+ (support complet)
- Firefox 88+ (support complet)
- Edge 90+ (support complet)
- Safari 14+ (support partiel, tester la webcam)

**Polyfills nécessaires:**
- Aucun pour les navigateurs modernes
- Vérifier `navigator.mediaDevices` avant utilisation

### Limitations Connues

1. **Éclairage**: La détection peut être affectée par un éclairage faible
2. **Arrière-plan**: Un arrière-plan complexe peut réduire la précision
3. **Distance**: La main doit être à une distance raisonnable de la caméra (30-60cm)
4. **Orientation**: Les gestes doivent être face à la caméra
5. **Performance**: Sur des machines anciennes, le FPS peut être réduit
