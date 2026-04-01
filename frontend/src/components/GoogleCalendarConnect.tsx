/**
 * Composant de connexion Google Calendar
 * 
 * Permet à l'utilisateur de connecter/déconnecter son compte Google
 */

import React, { useState, useEffect } from 'react';
import { 
  initGoogleCalendar, 
  requestGoogleAuth, 
  disconnectGoogle, 
  getGoogleConnectionStatus 
} from '../services/googleCalendarService';

interface GoogleCalendarConnectProps {
  onConnectionChange?: (connected: boolean) => void;
}

export const GoogleCalendarConnect: React.FC<GoogleCalendarConnectProps> = ({ 
  onConnectionChange 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialiser l'API Google au montage
    initGoogleCalendar().catch(err => {
      console.error('Erreur d\'initialisation Google Calendar:', err);
      setError('Impossible de charger l\'API Google Calendar');
    });

    // Vérifier le statut de connexion
    const status = getGoogleConnectionStatus();
    setIsConnected(status.connected);
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await requestGoogleAuth();
      if (success) {
        setIsConnected(true);
        onConnectionChange?.(true);
      } else {
        setError('Autorisation refusée');
      }
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogle();
    setIsConnected(false);
    onConnectionChange?.(false);
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <span className="text-sm text-green-700">
          ✓ Connecté à Google Calendar
        </span>
        <button
          onClick={handleDisconnect}
          className="text-xs text-green-600 hover:text-green-800 underline"
        >
          Déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            Connexion...
          </>
        ) : (
          <>
            📅 Connecter Google Calendar
          </>
        )}
      </button>
      
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <p className="text-xs text-gray-600 italic">
        Les activités acceptées seront ajoutées automatiquement à votre calendrier
      </p>
    </div>
  );
};
