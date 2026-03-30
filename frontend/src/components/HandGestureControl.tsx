/**
 * Composant principal Hand Gesture Control
 * 
 * Ce composant orchestre tous les sous-modules pour fournir une interface
 * de contrôle gestuel complète permettant aux employés de répondre aux
 * recommandations RH via des gestes de la main.
 * 
 * Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  HandGestureControlProps,
  SystemStatus,
  Recommendation,
  GestureType,
} from '../types/hand-gesture.types';
import { useHandGesture } from '../hooks/useHandGesture';
import { GestureValidator } from '../utils/gestureValidator';
import { RecommendationService } from '../services/recommendationService';
import './HandGestureControl.css';

/**
 * Composant principal de contrôle gestuel
 * 
 * Fonctionnalités:
 * - Activation/désactivation de la webcam
 * - Détection et validation des gestes
 * - Envoi des réponses aux recommandations
 * - Affichage du statut et des gestes détectés
 * - Boutons alternatifs pour l'accessibilité
 * - Gestion complète des erreurs
 */
export const HandGestureControl: React.FC<HandGestureControlProps> = ({
  recommendations,
  onRecommendationResponse,
  authToken,
  className = '',
}) => {
  // État du composant
  const [status, setStatus] = useState<SystemStatus>('idle');
  const [gestureProgress, setGestureProgress] = useState(0);
  const [activeRecommendation, setActiveRecommendation] = useState<Recommendation | null>(null);
  const [statusMessage, setStatusMessage] = useState('En attente');
  const [apiError, setApiError] = useState<string | null>(null);

  // Instances des services
  const gestureValidatorRef = useRef(new GestureValidator());
  const recommendationServiceRef = useRef(new RecommendationService(authToken));

  // Hook de détection de gestes
  const {
    videoRef,
    canvasRef,
    isActive,
    currentGesture,
    confidenceScore,
    fps,
    error: cameraError,
    startCamera,
    stopCamera,
  } = useHandGesture({
    onGestureDetected: handleGestureDetected,
    minConfidence: 0.7,
  });

  /**
   * Sélectionne automatiquement la première recommandation si aucune n'est active
   */
  useEffect(() => {
    if (!activeRecommendation && recommendations.length > 0) {
      setActiveRecommendation(recommendations[0]);
    } else if (activeRecommendation && !recommendations.find(r => r.id === activeRecommendation.id)) {
      // La recommandation active a été supprimée, sélectionner la suivante
      setActiveRecommendation(recommendations[0] || null);
    }
  }, [recommendations, activeRecommendation]);

  /**
   * Met à jour le service de recommandation si le token change
   */
  useEffect(() => {
    recommendationServiceRef.current.updateToken(authToken);
  }, [authToken]);

  /**
   * Callback appelé quand un geste est détecté
   */
  function handleGestureDetected(gesture: GestureType): void {
    // Ignorer les gestes non pertinents
    if (gesture === 'UNKNOWN' || gesture === 'OPEN_HAND' || gesture === 'FIST') {
      return;
    }

    // Vérifier qu'il y a une recommandation active
    if (!activeRecommendation) {
      setStatusMessage('Aucune recommandation en attente');
      return;
    }

    // Mettre à jour le validateur de geste
    const validator = gestureValidatorRef.current;
    const result = validator.update(gesture);

    // Mettre à jour la progression
    setGestureProgress(result.progress);

    // Gérer l'instabilité
    if (result.isUnstable) {
      setStatus('detecting');
      setStatusMessage('Détection instable. Maintenez votre main stable.');
      return;
    }

    // Gérer le cooldown
    if (validator.isInCooldown()) {
      setStatus('cooldown');
      setStatusMessage('Cooldown actif');
      return;
    }

    // Mettre à jour le statut
    if (result.progress > 0 && result.progress < 100) {
      setStatus('validating');
      setStatusMessage(`Validation en cours... ${Math.round(result.progress)}%`);
    }

    // Geste validé
    if (result.isValidated) {
      handleValidatedGesture(gesture);
    }
  }

  /**
   * Gère un geste validé (maintenu pendant 1 seconde)
   */
  async function handleValidatedGesture(gesture: GestureType): Promise<void> {
    if (!activeRecommendation) return;

    // Déterminer la réponse selon le geste
    const response = gesture === 'THUMBS_UP' ? 'ACCEPTED' : 'REJECTED';
    const gestureLabel = gesture === 'THUMBS_UP' ? '👍 Pouce levé' : '👎 Pouce baissé';

    setStatus('processing');
    setStatusMessage(`Envoi de la réponse: ${gestureLabel}`);
    setApiError(null);

    try {
      // Appeler l'API
      const result = await recommendationServiceRef.current.respondToRecommendation(
        activeRecommendation.id,
        response,
        `Geste détecté: ${gestureLabel}`
      );

      if (result.success) {
        // Succès
        setStatus('idle');
        setStatusMessage('Action effectuée avec succès');
        setGestureProgress(0);

        // Notifier le parent
        onRecommendationResponse(activeRecommendation.id, response);

        // Réinitialiser le validateur
        gestureValidatorRef.current.reset();

        // Sélectionner la prochaine recommandation
        const nextRecommendations = recommendations.filter(r => r.id !== activeRecommendation.id);
        setActiveRecommendation(nextRecommendations[0] || null);
      } else {
        // Erreur API
        setStatus('error');
        setStatusMessage('Erreur lors de l\'envoi');
        setApiError(result.error || 'Erreur inconnue');
        setGestureProgress(0);
        gestureValidatorRef.current.reset();
      }
    } catch (err) {
      // Erreur inattendue
      setStatus('error');
      setStatusMessage('Erreur inattendue');
      setApiError('Une erreur est survenue. Veuillez réessayer.');
      setGestureProgress(0);
      gestureValidatorRef.current.reset();
    }
  }

  /**
   * Gère le clic sur le bouton Accepter
   */
  const handleAcceptClick = useCallback(async () => {
    if (!activeRecommendation || status === 'processing' || gestureValidatorRef.current.isInCooldown()) {
      return;
    }

    setStatus('processing');
    setStatusMessage('Envoi de la réponse: Accepter');
    setApiError(null);

    try {
      const result = await recommendationServiceRef.current.respondToRecommendation(
        activeRecommendation.id,
        'ACCEPTED',
        'Bouton cliqué: Accepter'
      );

      if (result.success) {
        setStatus('idle');
        setStatusMessage('Recommandation acceptée');
        onRecommendationResponse(activeRecommendation.id, 'ACCEPTED');

        const nextRecommendations = recommendations.filter(r => r.id !== activeRecommendation.id);
        setActiveRecommendation(nextRecommendations[0] || null);
      } else {
        setStatus('error');
        setApiError(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      setStatus('error');
      setApiError('Une erreur est survenue');
    }
  }, [activeRecommendation, status, recommendations, onRecommendationResponse]);

  /**
   * Gère le clic sur le bouton Refuser
   */
  const handleRejectClick = useCallback(async () => {
    if (!activeRecommendation || status === 'processing' || gestureValidatorRef.current.isInCooldown()) {
      return;
    }

    setStatus('processing');
    setStatusMessage('Envoi de la réponse: Refuser');
    setApiError(null);

    try {
      const result = await recommendationServiceRef.current.respondToRecommendation(
        activeRecommendation.id,
        'REJECTED',
        'Bouton cliqué: Refuser'
      );

      if (result.success) {
        setStatus('idle');
        setStatusMessage('Recommandation refusée');
        onRecommendationResponse(activeRecommendation.id, 'REJECTED');

        const nextRecommendations = recommendations.filter(r => r.id !== activeRecommendation.id);
        setActiveRecommendation(nextRecommendations[0] || null);
      } else {
        setStatus('error');
        setApiError(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      setStatus('error');
      setApiError('Une erreur est survenue');
    }
  }, [activeRecommendation, status, recommendations, onRecommendationResponse]);

  /**
   * Gère le toggle de la caméra
   */
  const handleCameraToggle = useCallback(async () => {
    if (isActive) {
      stopCamera();
      setStatus('idle');
      setStatusMessage('Caméra désactivée');
      setGestureProgress(0);
      gestureValidatorRef.current.reset();
    } else {
      await startCamera();
      if (!cameraError) {
        setStatus('detecting');
        setStatusMessage('Caméra active - Montrez votre main');
      }
    }
  }, [isActive, startCamera, stopCamera, cameraError]);

  /**
   * Affiche l'icône du geste actuel
   */
  const getGestureIcon = (gesture: GestureType | null): string => {
    switch (gesture) {
      case 'THUMBS_UP':
        return '👍';
      case 'THUMBS_DOWN':
        return '👎';
      case 'OPEN_HAND':
        return '✋';
      case 'FIST':
        return '✊';
      default:
        return '❓';
    }
  };

  /**
   * Affiche le label du geste actuel
   */
  const getGestureLabel = (gesture: GestureType | null): string => {
    switch (gesture) {
      case 'THUMBS_UP':
        return 'Pouce levé';
      case 'THUMBS_DOWN':
        return 'Pouce baissé';
      case 'OPEN_HAND':
        return 'Main ouverte';
      case 'FIST':
        return 'Poing fermé';
      case 'UNKNOWN':
        return 'Geste inconnu';
      default:
        return 'Aucun geste';
    }
  };

  return (
    <div className={`hand-gesture-control ${className}`}>
      {/* En-tête avec bouton caméra */}
      <div className="hgc-header">
        <h2>Contrôle Gestuel</h2>
        <button
          className={`hgc-camera-toggle ${isActive ? 'active' : ''}`}
          onClick={handleCameraToggle}
          aria-label={isActive ? 'Désactiver la caméra' : 'Activer la caméra'}
          title={isActive ? 'Désactiver la caméra' : 'Activer la caméra'}
        >
          {isActive ? '📹 Désactiver' : '📷 Activer la caméra'}
        </button>
      </div>

      {/* Zone vidéo et canvas */}
      <div className="hgc-video-container">
        <video
          ref={videoRef}
          className="hgc-video"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="hgc-canvas-overlay"
        />
        
        {!isActive && (
          <div className="hgc-video-placeholder">
            <p>📷 Activez la caméra pour commencer</p>
          </div>
        )}
      </div>

      {/* Affichage du geste détecté */}
      {isActive && (
        <div className="hgc-gesture-display">
          <div className="hgc-gesture-icon">{getGestureIcon(currentGesture)}</div>
          <div className="hgc-gesture-label">{getGestureLabel(currentGesture)}</div>
          {confidenceScore > 0 && (
            <div className="hgc-confidence">
              Confiance: {Math.round(confidenceScore * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Barre de progression de validation */}
      {gestureProgress > 0 && (
        <div className="hgc-progress-container">
          <div className="hgc-progress-label">Validation en cours...</div>
          <div className="hgc-progress-bar">
            <div
              className="hgc-progress-fill"
              style={{ width: `${gestureProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Statut du système */}
      <div className={`hgc-status hgc-status-${status}`} role="status" aria-live="polite">
        <span className="hgc-status-icon">
          {status === 'processing' && '⏳'}
          {status === 'error' && '❌'}
          {status === 'cooldown' && '⏸️'}
          {(status === 'idle' || status === 'detecting' || status === 'validating') && 'ℹ️'}
        </span>
        <span className="hgc-status-message">{statusMessage}</span>
        {isActive && <span className="hgc-fps">FPS: {fps}</span>}
      </div>

      {/* Messages d'erreur */}
      {(cameraError || apiError) && (
        <div className="hgc-error" role="alert">
          <strong>Erreur:</strong> {cameraError || apiError}
        </div>
      )}

      {/* Liste des recommandations */}
      <div className="hgc-recommendations">
        <h3>Recommandations en attente ({recommendations.length})</h3>
        {recommendations.length === 0 ? (
          <p className="hgc-no-recommendations">Aucune recommandation en attente</p>
        ) : (
          <ul className="hgc-recommendation-list">
            {recommendations.map((rec) => (
              <li
                key={rec.id}
                className={`hgc-recommendation-item ${
                  activeRecommendation?.id === rec.id ? 'active' : ''
                }`}
                aria-current={activeRecommendation?.id === rec.id ? 'true' : undefined}
              >
                <div className="hgc-rec-title">{rec.title}</div>
                <div className="hgc-rec-category">{rec.category}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Boutons alternatifs */}
      <div className="hgc-actions">
        <button
          className="hgc-btn hgc-btn-accept"
          onClick={handleAcceptClick}
          disabled={!activeRecommendation || status === 'processing' || gestureValidatorRef.current.isInCooldown()}
          aria-label="Accepter la recommandation"
          title="Accepter la recommandation (ou utilisez le geste pouce levé)"
        >
          👍 Accepter
        </button>
        <button
          className="hgc-btn hgc-btn-reject"
          onClick={handleRejectClick}
          disabled={!activeRecommendation || status === 'processing' || gestureValidatorRef.current.isInCooldown()}
          aria-label="Refuser la recommandation"
          title="Refuser la recommandation (ou utilisez le geste pouce baissé)"
        >
          👎 Refuser
        </button>
      </div>

      {/* Aide sur les gestes */}
      <div className="hgc-help">
        <details>
          <summary>Aide - Gestes disponibles</summary>
          <ul>
            <li>👍 <strong>Pouce levé</strong>: Accepter la recommandation</li>
            <li>👎 <strong>Pouce baissé</strong>: Refuser la recommandation</li>
            <li>⏱️ Maintenez le geste pendant 1 seconde pour valider</li>
            <li>⏸️ Cooldown de 2 secondes après chaque action</li>
          </ul>
        </details>
      </div>
    </div>
  );
};
