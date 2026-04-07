/**
 * Module de validation des gestes
 * 
 * Ce module gère la stabilité des gestes détectés et le cooldown après validation.
 * Il s'assure qu'un geste est maintenu pendant une durée minimale avant d'être validé,
 * et empêche les déclenchements multiples via un système de cooldown.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5
 */

import type { GestureType, GestureValidationState, ValidationUpdateResult } from '../types/hand-gesture.types';

/**
 * Classe de validation des gestes avec gestion de la stabilité et du cooldown
 * 
 * Cette classe implémente la logique de validation des gestes:
 * - Un geste doit être maintenu pendant STABILITY_DURATION (1s) pour être validé
 * - Après validation, un COOLDOWN_DURATION (2s) empêche de nouveaux déclenchements
 * - Si le geste change plus de INSTABILITY_THRESHOLD fois en INSTABILITY_WINDOW, il est marqué comme instable
 */
export class GestureValidator {
  private state: GestureValidationState;
  
  /** Durée de stabilité requise pour valider un geste (ms) */
  private readonly STABILITY_DURATION = 1000;
  
  /** Durée du cooldown après validation (ms) */
  private readonly COOLDOWN_DURATION = 2000;
  
  /** Nombre maximum de changements de geste avant de marquer comme instable */
  private readonly INSTABILITY_THRESHOLD = 3;
  
  /** Fenêtre de temps pour compter les changements de geste (ms) */
  private readonly INSTABILITY_WINDOW = 2000;

  constructor() {
    this.state = {
      currentGesture: null,
      startTime: null,
      isInCooldown: false,
      cooldownEndTime: null,
      gestureChangeCount: 0,
      lastChangeTime: 0,
    };
  }

  /**
   * Met à jour l'état de validation avec un nouveau geste détecté
   * 
   * @param gesture - Le geste actuellement détecté
   * @returns Résultat de la validation avec progression et statut d'instabilité
   * 
   * Logique:
   * 1. Si en cooldown, retourner isValidated: false
   * 2. Si le geste change, réinitialiser le timer et incrémenter gestureChangeCount
   * 3. Si gestureChangeCount > INSTABILITY_THRESHOLD en INSTABILITY_WINDOW, marquer comme instable
   * 4. Si le geste est stable pendant STABILITY_DURATION, valider et démarrer le cooldown
   * 5. Calculer le progrès: (Date.now() - startTime) / STABILITY_DURATION * 100
   */
  update(gesture: GestureType): ValidationUpdateResult {
    const now = Date.now();

    // Vérifier si on est en cooldown
    if (this.state.isInCooldown) {
      if (this.state.cooldownEndTime && now >= this.state.cooldownEndTime) {
        // Cooldown terminé
        this.state.isInCooldown = false;
        this.state.cooldownEndTime = null;
      } else {
        // Toujours en cooldown
        return {
          isValidated: false,
          progress: 0,
          isUnstable: false,
        };
      }
    }

    // Nettoyer les anciens changements de geste hors de la fenêtre d'instabilité
    if (now - this.state.lastChangeTime > this.INSTABILITY_WINDOW) {
      this.state.gestureChangeCount = 0;
    }

    // Vérifier si le geste a changé
    if (this.state.currentGesture !== gesture) {
      // Le geste a changé, réinitialiser le timer
      this.state.currentGesture = gesture;
      this.state.startTime = now;
      this.state.gestureChangeCount++;
      this.state.lastChangeTime = now;

      return {
        isValidated: false,
        progress: 0,
        isUnstable: this.state.gestureChangeCount > this.INSTABILITY_THRESHOLD,
      };
    }

    // Le geste est le même, vérifier la durée
    if (this.state.startTime === null) {
      // Première détection de ce geste
      this.state.startTime = now;
      return {
        isValidated: false,
        progress: 0,
        isUnstable: false,
      };
    }

    // Calculer le temps écoulé et la progression
    const elapsed = now - this.state.startTime;
    const progress = Math.min((elapsed / this.STABILITY_DURATION) * 100, 100);

    // Vérifier si le geste est validé
    if (elapsed >= this.STABILITY_DURATION) {
      // Geste validé, démarrer le cooldown
      this.state.isInCooldown = true;
      this.state.cooldownEndTime = now + this.COOLDOWN_DURATION;
      
      // Réinitialiser le compteur de changements
      this.state.gestureChangeCount = 0;

      return {
        isValidated: true,
        progress: 100,
        isUnstable: false,
      };
    }

    // Geste en cours de validation
    return {
      isValidated: false,
      progress,
      isUnstable: this.state.gestureChangeCount > this.INSTABILITY_THRESHOLD,
    };
  }

  /**
   * Réinitialise l'état de validation
   * Utilisé pour annuler une validation en cours ou réinitialiser après une erreur
   */
  reset(): void {
    this.state = {
      currentGesture: null,
      startTime: null,
      isInCooldown: false,
      cooldownEndTime: null,
      gestureChangeCount: 0,
      lastChangeTime: 0,
    };
  }

  /**
   * Vérifie si le système est actuellement en cooldown
   * 
   * @returns true si en cooldown, false sinon
   */
  isInCooldown(): boolean {
    if (!this.state.isInCooldown) {
      return false;
    }

    // Vérifier si le cooldown est terminé
    const now = Date.now();
    if (this.state.cooldownEndTime && now >= this.state.cooldownEndTime) {
      this.state.isInCooldown = false;
      this.state.cooldownEndTime = null;
      return false;
    }

    return true;
  }

  /**
   * Obtient le temps restant du cooldown en millisecondes
   * 
   * @returns Temps restant en ms, ou 0 si pas en cooldown
   */
  getCooldownRemaining(): number {
    if (!this.state.isInCooldown || !this.state.cooldownEndTime) {
      return 0;
    }

    const remaining = this.state.cooldownEndTime - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Obtient le geste actuellement en cours de validation
   * 
   * @returns Le geste actuel ou null
   */
  getCurrentGesture(): GestureType | null {
    return this.state.currentGesture;
  }

  /**
   * Obtient le nombre de changements de geste récents
   * Utile pour le débogage et l'affichage de l'instabilité
   * 
   * @returns Nombre de changements dans la fenêtre d'instabilité
   */
  getGestureChangeCount(): number {
    const now = Date.now();
    
    // Si hors de la fenêtre, retourner 0
    if (now - this.state.lastChangeTime > this.INSTABILITY_WINDOW) {
      return 0;
    }
    
    return this.state.gestureChangeCount;
  }
}
