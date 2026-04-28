/**
 * Hook personnalisé pour la détection de gestes de la main avec MediaPipe
 * 
 * Ce hook encapsule toute la logique d'intégration avec MediaPipe Hands:
 * - Gestion de la webcam
 * - Initialisation de MediaPipe
 * - Traitement des frames en temps réel
 * - Détection des gestes
 * - Rendu des landmarks sur canvas
 * - Optimisations de performance
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4, 2.6, 7.1, 7.2, 8.2, 8.4, 8.5, 8.6
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import type { UseHandGestureOptions, UseHandGestureReturn, NormalizedLandmark, GestureType } from '../types/hand-gesture.types';
import { detectGesture } from '../utils/gestureDetector';
import { renderHand, clearCanvas, resizeCanvas } from '../utils/canvasRenderer';

/**
 * Hook pour la détection de gestes de la main en temps réel
 * 
 * @param options - Options de configuration du hook
 * @returns Objet contenant les refs, l'état et les fonctions de contrôle
 * 
 * @example
 * function MyComponent() {
 *   const {
 *     videoRef,
 *     canvasRef,
 *     isActive,
 *     currentGesture,
 *     startCamera,
 *     stopCamera,
 *     error
 *   } = useHandGesture({
 *     onGestureDetected: (gesture) => console.log('Geste:', gesture),
 *     minConfidence: 0.7
 *   });
 * 
 *   return (
 *     <div>
 *       <video ref={videoRef} />
 *       <canvas ref={canvasRef} />
 *       <button onClick={startCamera}>Activer</button>
 *     </div>
 *   );
 * }
 */
export function useHandGesture(options: UseHandGestureOptions): UseHandGestureReturn {
  const { onGestureDetected, minConfidence } = options;

  // Refs pour les éléments DOM
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs pour les instances MediaPipe et Camera
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs pour le suivi des performances
  const fpsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // État du hook
  const [isActive, setIsActive] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcule et met à jour le FPS
   */
  const updateFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFrameTimeRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, []);

  /**
   * Callback appelé par MediaPipe quand des résultats sont disponibles
   */
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;

    // Mettre à jour le FPS
    updateFPS();

    console.log('🎥 Frame reçue de MediaPipe, mains détectées:', results.multiHandLandmarks?.length || 0);

    // Vérifier si une main est détectée
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // Aucune main détectée
      clearCanvas(canvasRef.current);
      setLandmarks(null);
      setCurrentGesture(null);
      setConfidenceScore(0);
      return;
    }

    console.log('✅ Main détectée! Nombre de mains:', results.multiHandLandmarks.length);

    // Sélectionner la main avec le score de confiance le plus élevé
    let bestHandIndex = 0;
    let bestScore = 0;

    if (results.multiHandedness && results.multiHandedness.length > 1) {
      results.multiHandedness.forEach((handedness, index) => {
        const score = handedness.score || 0;
        if (score > bestScore) {
          bestScore = score;
          bestHandIndex = index;
        }
      });
    } else if (results.multiHandedness && results.multiHandedness.length === 1) {
      bestScore = results.multiHandedness[0].score || 0;
    }

    // Vérifier le score de confiance minimum
    if (bestScore < minConfidence) {
      clearCanvas(canvasRef.current);
      setLandmarks(null);
      setCurrentGesture(null);
      setConfidenceScore(bestScore);
      return;
    }

    // Récupérer les landmarks de la meilleure main
    const handLandmarks = results.multiHandLandmarks[bestHandIndex] as any;
    const normalizedLandmarks: NormalizedLandmark[] = [];
    
    for (let i = 0; i < handLandmarks.length; i++) {
      const lm = handLandmarks[i];
      normalizedLandmarks.push({
        x: lm.x,
        y: lm.y,
        z: lm.z,
      });
    }

    // Mettre à jour l'état
    setLandmarks(normalizedLandmarks);
    setConfidenceScore(bestScore);

    // Détecter le geste
    const gestureResult = detectGesture(normalizedLandmarks);
    console.log('🔍 Geste détecté par detectGesture:', gestureResult);
    setCurrentGesture(gestureResult.gesture);

    // Notifier le parent
    if (gestureResult.gesture !== 'UNKNOWN') {
      console.log('📢 Notification du geste au parent:', gestureResult.gesture);
      onGestureDetected(gestureResult.gesture);
    } else {
      console.log('⚠️ Geste UNKNOWN, pas de notification');
    }

    // Dessiner les landmarks sur le canvas
    renderHand(canvasRef.current, normalizedLandmarks, {
      drawConnections: true,
      drawLandmarks: true,
      landmarkColor: '#00FF00',
      connectionColor: '#00FF00',
      landmarkRadius: 5,
    });
  }, [minConfidence, onGestureDetected, updateFPS]);

  /**
   * Initialise MediaPipe Hands
   */
  const initializeMediaPipe = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Initialisation de MediaPipe Hands...');
      
      const hands = new Hands({
        locateFile: (file) => {
          // Utiliser le CDN officiel de Google avec tous les fichiers
          const baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915';
          console.log(`📦 Chargement du fichier: ${file} depuis ${baseUrl}/${file}`);
          return `${baseUrl}/${file}`;
        },
      });

      console.log('⚙️ Configuration de MediaPipe...');
      
      // Configuration plus permissive pour améliorer la détection
      hands.setOptions({
        maxNumHands: 1, // Réduire à 1 main pour de meilleures performances
        modelComplexity: 1, // Modèle moyen (0=lite, 1=full)
        minDetectionConfidence: 0.5, // Réduire le seuil pour faciliter la détection
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);

      handsRef.current = hands;
      console.log('✅ MediaPipe Hands initialisé avec succès');
    } catch (err) {
      console.error('❌ Erreur d\'initialisation MediaPipe:', err);
      throw new Error('Échec d\'initialisation de MediaPipe. Vérifiez votre connexion internet.');
    }
  }, [minConfidence, onResults]);

  /**
   * Démarre la caméra et initialise MediaPipe
   */
  const startCamera = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Vérifier que les éléments DOM sont disponibles
      if (!videoRef.current) {
        throw new Error('Élément vidéo non disponible');
      }

      // Demander l'accès à la webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Attendre que la vidéo soit chargée
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            resolve();
          };
        }
      });

      // Redimensionner le canvas pour correspondre à la vidéo
      if (canvasRef.current && videoRef.current) {
        resizeCanvas(canvasRef.current, videoRef.current);
      }

      // Initialiser MediaPipe
      await initializeMediaPipe();

      // Démarrer la caméra MediaPipe
      if (handsRef.current && videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });

        await camera.start();
        cameraRef.current = camera;
      }

      setIsActive(true);
      lastFrameTimeRef.current = performance.now();
    } catch (err: any) {
      console.error('Erreur de démarrage de la caméra:', err);

      // Gérer les différents types d'erreurs
      if (err.name === 'NotAllowedError') {
        setError('Permission caméra refusée. Veuillez autoriser l\'accès dans les paramètres du navigateur.');
      } else if (err.name === 'NotFoundError') {
        setError('Aucune webcam détectée. Veuillez connecter une caméra.');
      } else if (err.name === 'NotReadableError') {
        setError('Webcam déjà utilisée par une autre application. Veuillez la fermer.');
      } else if (err.message && err.message.includes('MediaPipe')) {
        setError(err.message);
      } else {
        setError('Erreur d\'accès à la webcam. Veuillez réessayer.');
      }

      // Nettoyer en cas d'erreur
      stopCamera();
    }
  }, [initializeMediaPipe]);

  /**
   * Arrête la caméra et libère toutes les ressources
   */
  const stopCamera = useCallback((): void => {
    // Arrêter le flux vidéo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Arrêter la caméra MediaPipe
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    // Fermer MediaPipe Hands
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    // Nettoyer l'animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Effacer le canvas
    if (canvasRef.current) {
      clearCanvas(canvasRef.current);
    }

    // Réinitialiser l'état
    setIsActive(false);
    setCurrentGesture(null);
    setLandmarks(null);
    setConfidenceScore(0);
    setFps(0);
    frameCountRef.current = 0;
  }, []);

  /**
   * Gère la visibilité de la page pour optimiser les performances
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        // Onglet inactif - réduire le FPS (géré par MediaPipe automatiquement)
        console.log('Onglet inactif - réduction des performances');
      } else if (!document.hidden && isActive) {
        // Onglet actif - reprendre le traitement normal
        console.log('Onglet actif - performances normales');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  /**
   * Nettoyage lors du démontage du composant
   */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isActive,
    currentGesture,
    landmarks,
    confidenceScore,
    fps,
    error,
    startCamera,
    stopCamera,
  };
}
