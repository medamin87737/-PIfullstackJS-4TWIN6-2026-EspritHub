import React, { useState } from 'react';
import { Chatbot } from './Chatbot';

/**
 * Exemple d'intégration du composant Chatbot dans une page d'activité
 * 
 * Ce composant montre comment:
 * 1. Afficher un bouton pour ouvrir le chatbot
 * 2. Passer l'activityId au chatbot
 * 3. Gérer l'ouverture/fermeture du chatbot
 */
export const ChatbotExample: React.FC<{ activityId: string }> = ({ activityId }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bouton pour ouvrir le chatbot */}
      {!isChatbotOpen && (
        <button
          onClick={() => setIsChatbotOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
          }}
          aria-label="Ouvrir le chatbot"
        >
          💬
        </button>
      )}

      {/* Chatbot */}
      {isChatbotOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
          }}
        >
          <Chatbot
            activityId={activityId}
            onClose={() => setIsChatbotOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
