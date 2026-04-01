/**
 * Version compacte du contrôle gestuel pour intégration dans les cartes d'activité
 * 
 * Ce composant affiche uniquement la caméra et les gestes pour UNE recommandation spécifique
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GestureType } from '../types/hand-gesture.types';
import { useHandGesture } from '../hooks/useHandGesture';
import { GestureValidator } from '../utils/gestureValidator';

interface MiniHandGestureControlProps {
  recommendationId: string;
  onAccept: () => void;
  onReject: () => void;
  isActive: boolean;
  onToggle: () => void;
}

/**
 * Mini contrôle gestuel pour une seule activité
 */
export const MiniHandGestureControl: React.FC<MiniHandGestureControlProps> = ({
  recommendationId,
  onAccept,
  onReject,
  isActive,
  onToggle,
}) => {
  const [gestureProgress, setGestureProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const gestureValidatorRef = useRef(new GestureValidator());

  // Définir le callback AVANT useHandGesture
  const handleGestureDetected = useCallback((gesture: GestureType): void => {
    console.log('🎯 Geste détecté dans MiniHandGestureControl:', gesture);
    
    if (isProcessing) {
      console.log('⏸️ Traitement en cours, geste ignoré');
      return;
    }
    
    // Ignorer les gestes non pertinents
    if (gesture === 'UNKNOWN' || gesture === 'OPEN_HAND' || gesture === 'FIST') {
      console.log('❌ Geste non pertinent ignoré:', gesture);
      return;
    }

    const validator = gestureValidatorRef.current;
    const result = validator.update(gesture);

    console.log('📊 Résultat validation:', result);
    setGestureProgress(result.progress);

    if (result.isValidated) {
      console.log('✅ Geste validé! Action:', gesture);
      setIsProcessing(true);
      
      if (gesture === 'THUMBS_UP') {
        onAccept();
      } else if (gesture === 'THUMBS_DOWN') {
        onReject();
      }

      // Réinitialiser après un court délai
      setTimeout(() => {
        setIsProcessing(false);
        gestureValidatorRef.current.reset();
        setGestureProgress(0);
      }, 500);
    }
  }, [isProcessing, onAccept, onReject]);

  const {
    videoRef,
    canvasRef,
    currentGesture,
    confidenceScore,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useHandGesture({
    onGestureDetected: handleGestureDetected,
    minConfidence: 0.7,
  });

  // Démarrer/arrêter la caméra selon isActive
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
      gestureValidatorRef.current.reset();
      setGestureProgress(0);
    }
  }, [isActive, startCamera, stopCamera]);

  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        title="Activer le contrôle gestuel pour cette activité"
      >
        📷 Contrôle gestuel
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-900">Contrôle gestuel actif</span>
        <button
          onClick={onToggle}
          className="text-xs text-blue-600 hover:text-blue-800"
          title="Désactiver"
        >
          ✕
        </button>
      </div>

      {/* Vidéo miniature */}
      <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Geste et progression */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {currentGesture === 'THUMBS_UP' && '👍'}
            {currentGesture === 'THUMBS_DOWN' && '👎'}
            {currentGesture === 'OPEN_HAND' && '✋'}
            {currentGesture === 'FIST' && '✊'}
            {(!currentGesture || currentGesture === 'UNKNOWN') && '❓'}
          </span>
          <span className="text-gray-700">
            {currentGesture === 'THUMBS_UP' && 'Accepter'}
            {currentGesture === 'THUMBS_DOWN' && 'Refuser'}
            {currentGesture === 'OPEN_HAND' && 'Main ouverte'}
            {currentGesture === 'FIST' && 'Poing'}
            {(!currentGesture || currentGesture === 'UNKNOWN') && 'Aucun geste'}
          </span>
        </div>
        {confidenceScore > 0 && (
          <span className="text-gray-600">{Math.round(confidenceScore * 100)}%</span>
        )}
      </div>

      {/* Barre de progression */}
      {gestureProgress > 0 && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-100"
            style={{ width: `${gestureProgress}%` }}
          />
        </div>
      )}

      {/* Erreur */}
      {cameraError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {cameraError}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-600 italic">
        👍 Accepter | 👎 Refuser | Maintenez 1s
      </div>
    </div>
  );
};
