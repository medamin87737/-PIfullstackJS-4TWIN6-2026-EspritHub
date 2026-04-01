/**
 * Exemple d'utilisation du composant HandGestureControl
 * 
 * Ce fichier montre comment intégrer le composant dans une application React
 */

import React, { useState } from 'react';
import { HandGestureControl } from './HandGestureControl';
import type { Recommendation, RecommendationResponse } from '../types/hand-gesture.types';

/**
 * Exemple de composant parent qui utilise HandGestureControl
 */
export function HandGestureControlExample() {
  // État des recommandations (normalement récupérées depuis l'API)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: 'rec-1',
      title: 'Formation React Avancé',
      description: 'Formation de 3 jours sur React et TypeScript',
      category: 'Formation',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'rec-2',
      title: 'Certification AWS',
      description: 'Préparation à la certification AWS Solutions Architect',
      category: 'Certification',
      createdAt: new Date('2024-01-16'),
    },
    {
      id: 'rec-3',
      title: 'Mentorat Junior Développeur',
      description: 'Accompagner un développeur junior pendant 3 mois',
      category: 'Mentorat',
      createdAt: new Date('2024-01-17'),
    },
  ]);

  // Token JWT (normalement récupéré depuis le contexte d'authentification)
  const authToken = localStorage.getItem('accessToken') || 'demo-token';

  /**
   * Callback appelé quand l'utilisateur répond à une recommandation
   */
  const handleRecommendationResponse = (
    id: string,
    response: RecommendationResponse
  ) => {
    console.log(`Recommandation ${id} ${response === 'ACCEPTED' ? 'acceptée' : 'refusée'}`);

    // Retirer la recommandation de la liste
    setRecommendations((prev) => prev.filter((rec) => rec.id !== id));

    // Optionnel: Afficher une notification
    alert(`Recommandation ${response === 'ACCEPTED' ? 'acceptée' : 'refusée'} avec succès!`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Système de Contrôle Gestuel</h1>
      <p>
        Utilisez les gestes de la main pour répondre aux recommandations RH.
        Activez la caméra et faites un pouce levé (👍) pour accepter ou un pouce baissé (👎) pour refuser.
      </p>

      <HandGestureControl
        recommendations={recommendations}
        onRecommendationResponse={handleRecommendationResponse}
        authToken={authToken}
        className="my-custom-class"
      />

      {recommendations.length === 0 && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h2>🎉 Toutes les recommandations ont été traitées!</h2>
          <button
            onClick={() => {
              // Recharger des recommandations de test
              setRecommendations([
                {
                  id: 'rec-4',
                  title: 'Conférence Tech',
                  description: 'Participation à la conférence React Europe',
                  category: 'Événement',
                  createdAt: new Date(),
                },
              ]);
            }}
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Charger plus de recommandations
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Exemple d'intégration avec un contexte d'authentification
 */
export function HandGestureControlWithAuth() {
  // Simuler un contexte d'authentification
  const { user, token } = useAuth(); // Hook personnalisé (à implémenter)

  if (!user) {
    return <div>Veuillez vous connecter pour accéder aux recommandations.</div>;
  }

  return (
    <HandGestureControl
      recommendations={user.recommendations}
      onRecommendationResponse={(id, response) => {
        // Logique de mise à jour
        console.log(`User ${user.id} responded ${response} to ${id}`);
      }}
      authToken={token}
    />
  );
}

/**
 * Hook personnalisé pour l'authentification (exemple)
 */
function useAuth() {
  // Implémentation simplifiée
  return {
    user: {
      id: 'user-123',
      name: 'John Doe',
      recommendations: [],
    },
    token: localStorage.getItem('accessToken') || '',
  };
}
