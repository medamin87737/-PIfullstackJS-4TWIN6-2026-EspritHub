import { ChatMessageRequest, ChatMessageResponse } from '../types/chat.types';

class ChatService {
  private readonly baseUrl = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/chat`
    : 'http://localhost:3000/chat';

  async sendMessage(message: string, activityId: string): Promise<string> {
    try {
      const payload: ChatMessageRequest = {
        message,
        activityId,
      };

      console.log('🔍 ChatService - Envoi de la requête:', {
        url: this.baseUrl,
        payload,
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 ChatService - Réponse reçue:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        // Gérer les différents codes d'erreur
        if (response.status === 400) {
          throw new Error('Message ou ID d\'activité invalide');
        } else if (response.status === 404) {
          throw new Error('Activité non trouvée');
        } else if (response.status === 503) {
          throw new Error('Le service de chatbot est temporairement indisponible');
        } else {
          throw new Error('Une erreur est survenue lors de l\'envoi du message');
        }
      }

      const data: ChatMessageResponse = await response.json();
      return data.message;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur de connexion au serveur');
    }
  }
}

export const chatService = new ChatService();
