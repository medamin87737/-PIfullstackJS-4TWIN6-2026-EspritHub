/**
 * Module Canvas Renderer - Rendu des landmarks de la main sur canvas
 * 
 * Ce module fournit les fonctions pour dessiner les 21 landmarks de la main
 * et leurs connexions sur un canvas overlay superposé à la vidéo.
 * 
 * Requirements: 2.2
 */

import type { NormalizedLandmark, RenderOptions, HandConnection } from '../types/hand-gesture.types';

/**
 * Connexions anatomiques entre les landmarks de la main
 * Chaque paire [a, b] représente une ligne à dessiner entre les landmarks a et b
 */
export const HAND_CONNECTIONS: HandConnection[] = [
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

/**
 * Options de rendu par défaut
 */
const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  drawConnections: true,
  drawLandmarks: true,
  landmarkColor: '#00FF00',
  connectionColor: '#00FF00',
  landmarkRadius: 5,
};

/**
 * Dessine la main sur le canvas avec les landmarks et connexions
 * 
 * Cette fonction prend les landmarks normalisés (coordonnées 0-1) et les dessine
 * sur le canvas en les convertissant aux coordonnées pixel du canvas.
 * 
 * @param canvas - Élément canvas HTML sur lequel dessiner
 * @param landmarks - Tableau des 21 landmarks de la main (coordonnées normalisées 0-1)
 * @param options - Options de rendu (couleurs, tailles, etc.)
 * 
 * @example
 * const canvas = document.getElementById('overlay') as HTMLCanvasElement;
 * const landmarks = [...]; // 21 landmarks détectés par MediaPipe
 * renderHand(canvas, landmarks, {
 *   drawConnections: true,
 *   drawLandmarks: true,
 *   landmarkColor: '#00FF00',
 *   connectionColor: '#00FF00',
 *   landmarkRadius: 5
 * });
 * 
 * @see Requirements 2.2 - Dessiner les landmarks sur le Canvas_Overlay
 */
export function renderHand(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  options: Partial<RenderOptions> = {}
): void {
  // Fusionner les options avec les valeurs par défaut
  const opts: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  
  // Obtenir le contexte 2D
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Impossible d\'obtenir le contexte 2D du canvas');
    return;
  }
  
  // Vérifier que nous avons bien 21 landmarks
  if (!landmarks || landmarks.length !== 21) {
    console.warn('renderHand: nombre de landmarks invalide', landmarks?.length);
    return;
  }
  
  // Effacer le canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Dessiner les connexions en premier (pour qu'elles soient sous les landmarks)
  if (opts.drawConnections) {
    ctx.strokeStyle = opts.connectionColor;
    ctx.lineWidth = 2;
    
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      // Convertir les coordonnées normalisées (0-1) en coordonnées pixel
      const startX = start.x * canvas.width;
      const startY = start.y * canvas.height;
      const endX = end.x * canvas.width;
      const endY = end.y * canvas.height;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
  }
  
  // Dessiner les landmarks (points)
  if (opts.drawLandmarks) {
    ctx.fillStyle = opts.landmarkColor;
    
    landmarks.forEach((landmark) => {
      // Convertir les coordonnées normalisées (0-1) en coordonnées pixel
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, opts.landmarkRadius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

/**
 * Redimensionne le canvas pour correspondre aux dimensions de la vidéo
 * 
 * Cette fonction doit être appelée quand la vidéo est chargée ou redimensionnée
 * pour s'assurer que le canvas overlay a exactement les mêmes dimensions.
 * 
 * @param canvas - Élément canvas à redimensionner
 * @param video - Élément vidéo de référence
 * 
 * @example
 * const canvas = document.getElementById('overlay') as HTMLCanvasElement;
 * const video = document.getElementById('webcam') as HTMLVideoElement;
 * 
 * video.addEventListener('loadedmetadata', () => {
 *   resizeCanvas(canvas, video);
 * });
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): void {
  // Définir les dimensions du canvas pour correspondre à la vidéo
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
  
  // Ajuster le style CSS pour correspondre à l'affichage de la vidéo
  canvas.style.width = `${video.clientWidth}px`;
  canvas.style.height = `${video.clientHeight}px`;
}

/**
 * Efface complètement le canvas
 * 
 * Utilisé quand aucune main n'est détectée ou quand la caméra est désactivée.
 * 
 * @param canvas - Élément canvas à effacer
 * 
 * @example
 * const canvas = document.getElementById('overlay') as HTMLCanvasElement;
 * clearCanvas(canvas);
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
