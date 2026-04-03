import React, { useState, useEffect, useRef } from 'react';
import { ChatbotProps, Message, QuickSuggestion } from '../types/chat.types';
import { chatService } from '../services/chatService';
import './Chatbot.css';

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  {
    id: '1',
    text: 'Explique cette activité',
    displayText: 'Explique cette activité',
  },
  {
    id: '2',
    text: 'Pourquoi je suis recommandé ?',
    displayText: 'Pourquoi recommandé ?',
  },
  {
    id: '3',
    text: 'Quelles compétences vais-je développer ?',
    displayText: 'Quelles compétences ?',
  },
];

export const Chatbot: React.FC<ChatbotProps> = ({ activityId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validation de activityId
  if (!activityId || activityId.trim() === '') {
    return (
      <div className="chatbot-error">
        <p>Erreur: Aucune activité spécifiée</p>
        <p>Veuillez sélectionner une activité pour utiliser le chatbot.</p>
      </div>
    );
  }

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fonction pour générer un ID unique
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fonction pour envoyer un message
  const handleSendMessage = async (text: string) => {
    // Valider que le message n'est pas vide
    if (!text || text.trim() === '') {
      return;
    }

    const messageText = text.trim();

    // Ajouter le message utilisateur immédiatement
    const userMessage: Message = {
      id: generateId(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Log pour déboguer
      console.log('📤 Envoi du message au chatbot:', { message: messageText, activityId });
      
      // Envoyer au backend
      const botResponse = await chatService.sendMessage(messageText, activityId);

      // Ajouter la réponse du bot
      const botMessage: Message = {
        id: generateId(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      // Gérer les erreurs
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      
      const errorBotMessage: Message = {
        id: generateId(),
        text: `Désolé, ${errorMessage}. Veuillez réessayer.`,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorBotMessage]);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer l'envoi via le bouton
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Gérer l'envoi via la touche Entrée
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Gérer le clic sur une suggestion
  const handleSuggestionClick = (suggestion: QuickSuggestion) => {
    handleSendMessage(suggestion.text);
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>Assistant RH</h3>
        {onClose && (
          <button className="chatbot-close-btn" onClick={onClose} aria-label="Fermer le chatbot">
            ×
          </button>
        )}
      </div>

      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="chatbot-welcome">
            <p>Bonjour ! Je suis votre assistant RH.</p>
            <p>Posez-moi des questions sur cette activité.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message message-${message.sender}`}
          >
            <div className="message-content">{message.text}</div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-bot">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-suggestions">
        {QUICK_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.id}
            className="suggestion-btn"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isLoading}
          >
            {suggestion.displayText}
          </button>
        ))}
      </div>

      <form className="chatbot-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chatbot-input"
          placeholder="Tapez votre message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          aria-label="Message pour le chatbot"
        />
        <button
          type="submit"
          className="chatbot-send-btn"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Envoyer le message"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
};
