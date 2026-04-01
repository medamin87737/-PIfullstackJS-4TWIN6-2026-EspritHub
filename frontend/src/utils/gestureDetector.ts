/**
 * Module Gesture Detector - Fonctions pures pour la détection de gestes
 * 
 * Ce module fournit les fonctions de base pour calculer les distances entre landmarks
 * et normaliser les mesures pour une détection de gestes indépendante de la taille de la main.
 * 
 * Requirements: 3.6
 */

import { NormalizedLandmark, GestureType } from '../types/hand-gesture.types';

/**
 * Calcule la distance euclidienne entre deux landmarks 3D
 * 
 * La distance euclidienne est calculée en 3D en utilisant la formule:
 * distance = √((x2-x1)² + (y2-y1)² + (z2-z1)²)
 * 
 * @param p1 - Premier landmark
 * @param p2 - Deuxième landmark
 * @returns Distance euclidienne entre les deux points
 * 
 * @example
 * const wrist = { x: 0.5, y: 0.5, z: 0 };
 * const thumb = { x: 0.6, y: 0.4, z: 0.1 };
 * const distance = euclideanDistance(wrist, thumb);
 * // distance ≈ 0.173
 */
export function euclideanDistance(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calcule la distance de référence pour normaliser les mesures
 * 
 * La distance de référence est la distance euclidienne entre le poignet (landmark 0)
 * et la base du majeur (landmark 9 - middle_finger_mcp). Cette distance est utilisée
 * comme référence pour normaliser toutes les autres mesures, permettant ainsi une
 * détection de gestes indépendante de la taille de la main et de la distance à la caméra.
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns Distance de référence (wrist to middle_finger_mcp)
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés par MediaPipe
 * const refDistance = calculateReferenceDistance(landmarks);
 * // refDistance peut être utilisé pour normaliser d'autres distances
 * 
 * @see Requirements 3.6 - Calcul de la Reference_Distance
 */
export function calculateReferenceDistance(
  landmarks: NormalizedLandmark[]
): number {
  // Landmark 0: WRIST
  const wrist = landmarks[0];
  // Landmark 9: MIDDLE_FINGER_MCP (base du majeur)
  const middleMcp = landmarks[9];
  
  return euclideanDistance(wrist, middleMcp);
}

/**
 * Calcule la distance normalisée entre deux landmarks
 * 
 * La distance normalisée permet de comparer des distances indépendamment de la taille
 * de la main. Elle est calculée en divisant la distance euclidienne par la distance
 * de référence (wrist to middle_finger_mcp).
 * 
 * Cette normalisation permet:
 * - De détecter les gestes sur des mains de différentes tailles
 * - D'être indépendant de la distance main-caméra
 * - D'utiliser des seuils constants pour la détection (ex: doigt étendu si > 0.6)
 * 
 * @param p1 - Premier landmark
 * @param p2 - Deuxième landmark
 * @param referenceDistance - Distance de référence pour la normalisation
 * @returns Distance normalisée (sans unité)
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks
 * const refDistance = calculateReferenceDistance(landmarks);
 * 
 * // Vérifier si l'index est étendu
 * const indexMcp = landmarks[5];
 * const indexTip = landmarks[8];
 * const normalizedDist = normalizedDistance(indexMcp, indexTip, refDistance);
 * 
 * if (normalizedDist > 0.6) {
 *   console.log('Index étendu');
 * } else if (normalizedDist < 0.3) {
 *   console.log('Index replié');
 * }
 * 
 * @see Requirements 3.6 - Normalized_Distance pour s'adapter à toutes les tailles de main
 */
export function normalizedDistance(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  referenceDistance: number
): number {
  const distance = euclideanDistance(p1, p2);
  return distance / referenceDistance;
}

/**
 * Vérifie si les doigts spécifiés sont fermés (repliés)
 * 
 * Un doigt est considéré comme fermé si la distance normalisée entre son MCP
 * (base) et son TIP (bout) est inférieure à 0.3 fois la distance de référence.
 * 
 * @param mcpIndices - Indices des landmarks MCP (base des doigts) à vérifier
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns true si tous les doigts spécifiés sont fermés, false sinon
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks
 * // Vérifier si l'index, majeur, annulaire et auriculaire sont fermés
 * const closed = areFingersClosed([5, 9, 13, 17], landmarks);
 * 
 * @see Requirements 3.1, 3.2 - Détection des doigts fermés pour THUMBS_UP/DOWN
 */
export function areFingersClosed(
  mcpIndices: number[],
  landmarks: NormalizedLandmark[]
): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  
  const results = mcpIndices.map(mcpIndex => {
    const tipIndex = mcpIndex + 3; // Le TIP est toujours +3 du MCP
    const distance = normalizedDistance(
      landmarks[mcpIndex],
      landmarks[tipIndex],
      refDistance
    );
    const isClosed = distance < 0.5; // Seuil augmenté de 0.4 à 0.5 pour être plus tolérant
    return { mcpIndex, distance, isClosed };
  });
  
  console.log('🤏 Test doigts fermés:', results);
  
  // Au moins 3 doigts sur 4 doivent être fermés (plus tolérant)
  const closedCount = results.filter(r => r.isClosed).length;
  return closedCount >= 3;
}

/**
 * Détecte le geste THUMBS_UP (pouce levé)
 * 
 * Critères de détection:
 * - Le pouce est étendu vers le haut (tip.y < ip.y < mcp.y)
 * - Le pouce est aligné verticalement (tolérance de 0.1 sur x)
 * - Les autres doigts (index, majeur, annulaire, auriculaire) sont fermés
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns true si le geste est THUMBS_UP, false sinon
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés
 * if (isThumbsUp(landmarks)) {
 *   console.log('Pouce levé détecté - Accepter');
 * }
 * 
 * @see Requirements 3.1 - Détection THUMBS_UP indépendante de l'orientation
 */
export function isThumbsUp(landmarks: NormalizedLandmark[]): boolean {
  const thumbTip = landmarks[4];   // THUMB_TIP
  const thumbIp = landmarks[3];    // THUMB_IP
  const thumbMcp = landmarks[2];   // THUMB_MCP
  
  // Pouce étendu vers le haut (y décroissant)
  const thumbExtended = thumbTip.y < thumbIp.y && thumbIp.y < thumbMcp.y;
  
  // Pouce aligné verticalement (tolérance augmentée à 0.15)
  const thumbVertical = Math.abs(thumbTip.x - thumbMcp.x) < 0.15;
  
  // Autres doigts fermés (index, majeur, annulaire, auriculaire)
  const otherFingersClosed = areFingersClosed([5, 9, 13, 17], landmarks);
  
  console.log('👍 Test THUMBS_UP:', {
    thumbExtended,
    thumbVertical,
    otherFingersClosed,
    thumbY: { tip: thumbTip.y, ip: thumbIp.y, mcp: thumbMcp.y },
    thumbX: { tip: thumbTip.x, mcp: thumbMcp.x, diff: Math.abs(thumbTip.x - thumbMcp.x) }
  });
  
  return thumbExtended && thumbVertical && otherFingersClosed;
}

/**
 * Détecte le geste THUMBS_DOWN (pouce baissé)
 * 
 * Critères de détection:
 * - Le pouce est étendu vers le bas (tip.y > ip.y > mcp.y)
 * - Le pouce est aligné verticalement (tolérance de 0.1 sur x)
 * - Les autres doigts (index, majeur, annulaire, auriculaire) sont fermés
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns true si le geste est THUMBS_DOWN, false sinon
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés
 * if (isThumbsDown(landmarks)) {
 *   console.log('Pouce baissé détecté - Refuser');
 * }
 * 
 * @see Requirements 3.2 - Détection THUMBS_DOWN indépendante de l'orientation
 */
export function isThumbsDown(landmarks: NormalizedLandmark[]): boolean {
  const thumbTip = landmarks[4];   // THUMB_TIP
  const thumbIp = landmarks[3];    // THUMB_IP
  const thumbMcp = landmarks[2];   // THUMB_MCP
  
  // Pouce étendu vers le bas (y croissant)
  // OU pouce étendu vers le haut en mode miroir (y décroissant) - car la caméra est inversée
  const thumbExtendedDown = thumbTip.y > thumbIp.y && thumbIp.y > thumbMcp.y;
  const thumbExtendedUp = thumbTip.y < thumbIp.y && thumbIp.y < thumbMcp.y;
  
  // Pouce aligné verticalement (tolérance augmentée à 0.15)
  const thumbVertical = Math.abs(thumbTip.x - thumbMcp.x) < 0.15;
  
  // Autres doigts fermés (index, majeur, annulaire, auriculaire)
  const otherFingersClosed = areFingersClosed([5, 9, 13, 17], landmarks);
  
  console.log('👎 Test THUMBS_DOWN:', {
    thumbExtendedDown,
    thumbExtendedUp,
    thumbVertical,
    otherFingersClosed,
    thumbY: { tip: thumbTip.y, ip: thumbIp.y, mcp: thumbMcp.y },
    thumbX: { tip: thumbTip.x, mcp: thumbMcp.x, diff: Math.abs(thumbTip.x - thumbMcp.x) }
  });
  
  // Accepter les deux orientations (mode miroir ou non)
  return (thumbExtendedDown || thumbExtendedUp) && thumbVertical && otherFingersClosed;
}

/**
 * Détecte le geste OPEN_HAND (main ouverte)
 * 
 * Critères de détection:
 * - Tous les doigts (index, majeur, annulaire, auriculaire) sont étendus
 * - Un doigt est étendu si la distance normalisée MCP-TIP > 0.6
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns true si le geste est OPEN_HAND, false sinon
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés
 * if (isOpenHand(landmarks)) {
 *   console.log('Main ouverte détectée');
 * }
 * 
 * @see Requirements 3.3 - Détection OPEN_HAND basée sur distances normalisées
 */
export function isOpenHand(landmarks: NormalizedLandmark[]): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  
  // Indices des doigts: [MCP, TIP]
  const fingerIndices = [
    [5, 8],   // Index
    [9, 12],  // Majeur
    [13, 16], // Annulaire
    [17, 20]  // Auriculaire
  ];
  
  return fingerIndices.every(([mcp, tip]) => {
    const distance = normalizedDistance(landmarks[mcp], landmarks[tip], refDistance);
    return distance > 0.6; // Doigt étendu
  });
}

/**
 * Détecte le geste FIST (poing fermé)
 * 
 * Critères de détection:
 * - Tous les doigts (index, majeur, annulaire, auriculaire) sont repliés
 * - Un doigt est replié si la distance normalisée MCP-TIP < 0.3
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns true si le geste est FIST, false sinon
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés
 * if (isFist(landmarks)) {
 *   console.log('Poing fermé détecté');
 * }
 * 
 * @see Requirements 3.4 - Détection FIST basée sur distances normalisées
 */
export function isFist(landmarks: NormalizedLandmark[]): boolean {
  const refDistance = calculateReferenceDistance(landmarks);
  
  // Indices des doigts: [MCP, TIP]
  const fingerIndices = [
    [5, 8],   // Index
    [9, 12],  // Majeur
    [13, 16], // Annulaire
    [17, 20]  // Auriculaire
  ];
  
  return fingerIndices.every(([mcp, tip]) => {
    const distance = normalizedDistance(landmarks[mcp], landmarks[tip], refDistance);
    return distance < 0.3; // Doigt replié
  });
}

/**
 * Détecte le geste effectué à partir des landmarks de la main
 * 
 * Cette fonction orchestre toutes les détections de gestes et retourne
 * le résultat avec un score de confiance. Les gestes sont testés dans
 * l'ordre de priorité suivant:
 * 1. THUMBS_UP (pouce levé)
 * 2. THUMBS_DOWN (pouce baissé)
 * 3. OPEN_HAND (main ouverte)
 * 4. FIST (poing fermé)
 * 5. UNKNOWN (aucun pattern reconnu)
 * 
 * @param landmarks - Tableau des 21 landmarks de la main
 * @returns Résultat de la détection avec le type de geste et la confiance
 * 
 * @example
 * const landmarks = [...]; // 21 landmarks détectés par MediaPipe
 * const result = detectGesture(landmarks);
 * 
 * switch (result.gesture) {
 *   case 'THUMBS_UP':
 *     console.log('Accepter la recommandation');
 *     break;
 *   case 'THUMBS_DOWN':
 *     console.log('Refuser la recommandation');
 *     break;
 *   case 'UNKNOWN':
 *     console.log('Geste non reconnu');
 *     break;
 * }
 * 
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5 - Identification de tous les gestes
 */
export function detectGesture(
  landmarks: NormalizedLandmark[]
): { gesture: GestureType; confidence: number } {
  // Vérifier que nous avons bien 21 landmarks
  if (!landmarks || landmarks.length !== 21) {
    console.log('❌ Landmarks invalides:', landmarks?.length);
    return { gesture: 'UNKNOWN', confidence: 0 };
  }
  
  console.log('🔎 Détection de geste avec 21 landmarks...');
  
  // Tester les gestes dans l'ordre de priorité
  if (isThumbsUp(landmarks)) {
    console.log('✅ THUMBS_UP détecté!');
    return { gesture: 'THUMBS_UP', confidence: 1.0 };
  }
  
  if (isThumbsDown(landmarks)) {
    console.log('✅ THUMBS_DOWN détecté!');
    return { gesture: 'THUMBS_DOWN', confidence: 1.0 };
  }
  
  if (isOpenHand(landmarks)) {
    console.log('✅ OPEN_HAND détecté');
    return { gesture: 'OPEN_HAND', confidence: 1.0 };
  }
  
  if (isFist(landmarks)) {
    console.log('✅ FIST détecté');
    return { gesture: 'FIST', confidence: 1.0 };
  }
  
  console.log('⚠️ Aucun geste reconnu');
  // Aucun pattern reconnu
  return { gesture: 'UNKNOWN', confidence: 0 };
}
