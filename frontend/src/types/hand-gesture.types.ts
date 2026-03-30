/**
 * Types et interfaces pour le système Hand Gesture Control
 * 
 * Ce fichier définit tous les types TypeScript nécessaires pour le contrôle gestuel
 * basé sur MediaPipe Hands, permettant aux utilisateurs de répondre aux recommandations
 * RH via des gestes de la main détectés par webcam.
 */

/**
 * Représente un landmark (point de repère) 3D normalisé de la main
 * Les coordonnées sont normalisées entre 0 et 1
 */
export interface NormalizedLandmark {
  /** Coordonnée X normalisée (0-1) */
  x: number;
  /** Coordonnée Y normalisée (0-1) */
  y: number;
  /** Coordonnée Z représentant la profondeur relative */
  z: number;
}

/**
 * Types de gestes reconnus par le système
 */
export type GestureType = 
  | 'THUMBS_UP'    // Pouce levé - Accepter
  | 'THUMBS_DOWN'  // Pouce baissé - Refuser
  | 'OPEN_HAND'    // Main ouverte
  | 'FIST'         // Poing fermé
  | 'UNKNOWN';     // Geste non reconnu

/**
 * Résultat de la détection d'un geste
 */
export interface GestureDetectionResult {
  /** Type de geste détecté */
  gesture: GestureType;
  /** Score de confiance de la détection (0-1) */
  confidence: number;
}

/**
 * Représente une recommandation RH
 */
export interface Recommendation {
  /** Identifiant unique de la recommandation */
  id: string;
  /** Titre de la recommandation */
  title: string;
  /** Description détaillée */
  description: string;
  /** Catégorie de la recommandation */
  category: string;
  /** Date de création */
  createdAt: Date;
  /** Date d'expiration optionnelle */
  expiresAt?: Date;
}

/**
 * Type de réponse à une recommandation
 */
export type RecommendationResponse = 'ACCEPTED' | 'REJECTED';

/**
 * Props du composant HandGestureControl
 */
export interface HandGestureControlProps {
  /** Liste des recommandations à afficher */
  recommendations: Recommendation[];
  /** Callback appelé quand l'utilisateur répond à une recommandation */
  onRecommendationResponse: (id: string, response: RecommendationResponse) => void;
  /** Token JWT pour l'authentification API */
  authToken: string;
  /** Classe CSS optionnelle pour le composant */
  className?: string;
}

/**
 * Statut du système de détection de gestes
 */
export type SystemStatus = 
  | 'idle'        // En attente
  | 'detecting'   // Détection en cours
  | 'validating'  // Validation du geste en cours
  | 'processing'  // Traitement de l'action
  | 'cooldown'    // Période de cooldown
  | 'error';      // Erreur

/**
 * État interne du composant HandGestureControl
 */
export interface HandGestureControlState {
  /** Indique si la caméra est active */
  isCameraActive: boolean;
  /** Geste actuellement détecté */
  currentGesture: GestureType | null;
  /** Progression de la validation du geste (0-100) */
  gestureProgress: number;
  /** Statut actuel du système */
  status: SystemStatus;
  /** Recommandation actuellement sélectionnée */
  activeRecommendation: Recommendation | null;
  /** Message d'erreur si présent */
  error: string | null;
  /** Frames par seconde actuels */
  fps: number;
  /** Score de confiance de la détection de la main */
  confidenceScore: number;
}

/**
 * Événement de geste détecté
 */
export interface GestureEvent {
  /** Type de geste */
  type: GestureType;
  /** Timestamp de la détection */
  timestamp: number;
  /** Score de confiance */
  confidence: number;
  /** Landmarks de la main au moment de la détection */
  landmarks: NormalizedLandmark[];
}

/**
 * Options de rendu pour le canvas
 */
export interface RenderOptions {
  /** Dessiner les connexions entre landmarks */
  drawConnections: boolean;
  /** Dessiner les landmarks (points) */
  drawLandmarks: boolean;
  /** Couleur des landmarks */
  landmarkColor: string;
  /** Couleur des connexions */
  connectionColor: string;
  /** Rayon des landmarks en pixels */
  landmarkRadius: number;
}

/**
 * Métriques de performance du système
 */
export interface PerformanceMetrics {
  /** Frames par seconde moyen */
  fps: number;
  /** Temps de traitement moyen par frame en ms */
  averageProcessingTime: number;
  /** Nombre de frames perdues */
  droppedFrames: number;
  /** Timestamp de la dernière mise à jour */
  lastUpdateTime: number;
}

/**
 * État de validation d'un geste
 */
export interface GestureValidationState {
  /** Geste actuellement en cours de validation */
  currentGesture: GestureType | null;
  /** Timestamp de début de la validation */
  startTime: number | null;
  /** Indique si le système est en cooldown */
  isInCooldown: boolean;
  /** Timestamp de fin du cooldown */
  cooldownEndTime: number | null;
  /** Nombre de changements de geste récents */
  gestureChangeCount: number;
  /** Timestamp du dernier changement de geste */
  lastChangeTime: number;
}

/**
 * Résultat de la mise à jour de validation
 */
export interface ValidationUpdateResult {
  /** Indique si le geste est validé */
  isValidated: boolean;
  /** Progression de la validation (0-100) */
  progress: number;
  /** Indique si la détection est instable */
  isUnstable: boolean;
}

/**
 * Réponse de l'API de recommandation
 */
export interface ApiResponse {
  /** Indique si la requête a réussi */
  success: boolean;
  /** Message de succès optionnel */
  message?: string;
  /** Message d'erreur optionnel */
  error?: string;
}

/**
 * Payload de la requête API pour répondre à une recommandation
 */
export interface RecommendationResponsePayload {
  /** ID de la recommandation */
  recommendationId: string;
  /** Réponse de l'utilisateur */
  response: RecommendationResponse;
  /** Justification optionnelle */
  justification?: string;
}

/**
 * Options de configuration pour le hook useHandGesture
 */
export interface UseHandGestureOptions {
  /** Callback appelé quand un geste est détecté */
  onGestureDetected: (gesture: GestureType) => void;
  /** Score de confiance minimal pour la détection (0-1) */
  minConfidence: number;
}

/**
 * Valeur de retour du hook useHandGesture
 */
export interface UseHandGestureReturn {
  /** Référence à l'élément vidéo */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Référence au canvas overlay */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Indique si la caméra est active */
  isActive: boolean;
  /** Geste actuellement détecté */
  currentGesture: GestureType | null;
  /** Landmarks de la main détectée */
  landmarks: NormalizedLandmark[] | null;
  /** Score de confiance de la détection */
  confidenceScore: number;
  /** Frames par seconde actuels */
  fps: number;
  /** Message d'erreur si présent */
  error: string | null;
  /** Fonction pour démarrer la caméra */
  startCamera: () => Promise<void>;
  /** Fonction pour arrêter la caméra */
  stopCamera: () => void;
}

/**
 * Connexions entre les landmarks de la main
 * Chaque paire représente une connexion à dessiner
 */
export type HandConnection = [number, number];

/**
 * Constantes pour les index des landmarks de la main
 */
export enum HandLandmarkIndex {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}
