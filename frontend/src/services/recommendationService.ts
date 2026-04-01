/**
 * Service de gestion des recommandations
 * 
 * Ce service gère les appels API vers le backend pour répondre aux recommandations.
 * Il utilise l'endpoint existant POST /api/recommendations/respond sans modification backend.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4
 */

import axios, { AxiosError } from 'axios';
import type { RecommendationResponse, ApiResponse, RecommendationResponsePayload } from '../types/hand-gesture.types';

/**
 * Service pour gérer les interactions avec l'API de recommandations
 * 
 * Ce service encapsule toute la logique d'appel API, y compris:
 * - L'authentification JWT
 * - La gestion des erreurs HTTP
 * - Le refresh du token si nécessaire
 * - La redirection vers login si le token ne peut pas être renouvelé
 */
export class RecommendationService {
  private authToken: string;

  /**
   * Crée une nouvelle instance du service
   * 
   * @param authToken - Token JWT pour l'authentification
   */
  constructor(authToken: string) {
    this.authToken = authToken;
  }

  /**
   * Met à jour le token d'authentification
   * 
   * Utilisé après un refresh du token pour mettre à jour le service
   * 
   * @param newToken - Nouveau token JWT
   */
  updateToken(newToken: string): void {
    this.authToken = newToken;
  }

  /**
   * Envoie une réponse à une recommandation (ACCEPTED ou REJECTED)
   * 
   * Cette méthode appelle l'endpoint POST /api/recommendations/respond avec le format exact:
   * { recommendationId: string, response: 'ACCEPTED' | 'REJECTED', justification?: string }
   * 
   * Gestion des erreurs:
   * - 200: Succès
   * - 401: Token expiré → tente un refresh, sinon redirige vers login
   * - 404: Recommandation non trouvée
   * - 500: Erreur serveur
   * - Erreur réseau: Pas de connexion
   * 
   * @param recommendationId - ID de la recommandation
   * @param response - Réponse de l'utilisateur ('ACCEPTED' ou 'REJECTED')
   * @param justification - Justification optionnelle de la réponse
   * @returns Résultat de l'opération avec succès/erreur
   * 
   * @example
   * const service = new RecommendationService(authToken);
   * 
   * // Accepter une recommandation
   * const result = await service.respondToRecommendation(
   *   'rec-123',
   *   'ACCEPTED',
   *   'Geste détecté: pouce levé'
   * );
   * 
   * if (result.success) {
   *   console.log('Recommandation acceptée');
   * } else {
   *   console.error('Erreur:', result.error);
   * }
   * 
   * @see Requirements 9.1, 9.2, 9.3, 9.4 - Format API et gestion des codes HTTP
   */
  async respondToRecommendation(
    recommendationId: string,
    response: RecommendationResponse,
    justification?: string
  ): Promise<ApiResponse> {
    try {
      // Préparer le payload selon le format exact de l'API
      const payload: RecommendationResponsePayload = {
        recommendationId,
        response,
        justification,
      };

      // Envoyer la requête POST avec le token JWT dans le header
      const result = await axios.post(
        '/api/recommendations/respond',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        message: result.data.message || 'Réponse enregistrée avec succès',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError, recommendationId, response, justification);
    }
  }

  /**
   * Gère les erreurs API et tente une récupération si possible
   * 
   * @param error - Erreur Axios
   * @param recommendationId - ID de la recommandation (pour retry)
   * @param response - Réponse de l'utilisateur (pour retry)
   * @param justification - Justification (pour retry)
   * @returns Résultat avec message d'erreur approprié
   */
  private async handleApiError(
    error: AxiosError,
    recommendationId: string,
    response: RecommendationResponse,
    justification?: string
  ): Promise<ApiResponse> {
    // Erreur réseau (pas de réponse du serveur)
    if (!error.response) {
      return {
        success: false,
        error: 'Connexion réseau perdue. Vérifiez votre connexion internet.',
      };
    }

    // Gérer les différents codes de statut HTTP
    switch (error.response.status) {
      case 401:
        // Token JWT expiré - tenter un refresh
        const refreshed = await this.refreshTokenIfNeeded();
        if (refreshed) {
          // Réessayer la requête avec le nouveau token
          return this.respondToRecommendation(recommendationId, response, justification);
        }
        
        // Impossible de rafraîchir le token, rediriger vers login
        return {
          success: false,
          error: 'Session expirée. Redirection vers la connexion...',
        };

      case 404:
        return {
          success: false,
          error: 'Recommandation non trouvée. Elle a peut-être été supprimée.',
        };

      case 500:
        return {
          success: false,
          error: 'Erreur serveur. Veuillez réessayer dans quelques instants.',
        };

      default:
        // Erreur générique
        const errorMessage = (error.response.data as any)?.message || 'Une erreur est survenue';
        return {
          success: false,
          error: errorMessage,
        };
    }
  }

  /**
   * Tente de rafraîchir le token JWT si nécessaire
   * 
   * Cette méthode vérifie si un endpoint de refresh existe et tente de l'utiliser.
   * Si le refresh réussit, le nouveau token est stocké et la méthode retourne true.
   * Si le refresh échoue, l'utilisateur est redirigé vers la page de login.
   * 
   * @returns true si le token a été rafraîchi, false sinon
   * 
   * @see Requirements 7.4 - Gestion du token JWT expiré
   */
  private async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      // Tenter de rafraîchir le token via l'endpoint de refresh
      // Note: L'implémentation exacte dépend de l'architecture d'authentification du backend
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // Pas de refresh token disponible, rediriger vers login
        this.redirectToLogin();
        return false;
      }

      // Appeler l'endpoint de refresh (adapter selon l'API backend)
      const result = await axios.post('/api/auth/refresh', {
        refreshToken,
      });

      if (result.data.accessToken) {
        // Nouveau token obtenu, le stocker
        const newToken = result.data.accessToken;
        this.authToken = newToken;
        localStorage.setItem('accessToken', newToken);
        
        return true;
      }

      // Refresh échoué, rediriger vers login
      this.redirectToLogin();
      return false;
    } catch (error) {
      // Erreur lors du refresh, rediriger vers login
      this.redirectToLogin();
      return false;
    }
  }

  /**
   * Redirige l'utilisateur vers la page de connexion
   * 
   * Nettoie les tokens stockés et redirige vers /login
   */
  private redirectToLogin(): void {
    // Nettoyer les tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Rediriger vers la page de login
    window.location.href = '/login';
  }
}
