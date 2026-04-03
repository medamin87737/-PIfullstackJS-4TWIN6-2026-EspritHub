# Composant Chatbot RH

## Vue d'ensemble

Le composant `Chatbot` est un assistant conversationnel intelligent qui permet aux employés de poser des questions sur les activités recommandées. Il utilise Rasa comme moteur NLP et communique avec le backend NestJS pour obtenir des réponses contextuelles.

## Fonctionnalités

- ✅ Interface de chat moderne et responsive
- ✅ Suggestions rapides pour guider l'utilisateur
- ✅ Indicateur de chargement pendant le traitement
- ✅ Gestion des erreurs avec messages conviviaux
- ✅ Scroll automatique vers les nouveaux messages
- ✅ Support clavier (Entrée pour envoyer)
- ✅ Accessibilité WCAG AA
- ✅ Design responsive (mobile et desktop)

## Installation

Le composant est déjà intégré dans le projet. Aucune installation supplémentaire n'est nécessaire.

## Utilisation

### Utilisation de base

```tsx
import { Chatbot } from './components/Chatbot';

function ActivityPage() {
  const activityId = "123456"; // ID de l'activité

  return (
    <div>
      <Chatbot activityId={activityId} />
    </div>
  );
}
```

### Avec bouton d'ouverture/fermeture

```tsx
import { useState } from 'react';
import { Chatbot } from './components/Chatbot';

function ActivityPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const activityId = "123456";

  return (
    <div>
      <button onClick={() => setIsChatOpen(true)}>
        Ouvrir le chatbot
      </button>

      {isChatOpen && (
        <Chatbot
          activityId={activityId}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
```

### Chatbot flottant (recommandé)

```tsx
import { ChatbotExample } from './components/ChatbotExample';

function ActivityPage() {
  const activityId = "123456";

  return (
    <div>
      {/* Votre contenu de page */}
      <h1>Détails de l'activité</h1>
      
      {/* Chatbot flottant en bas à droite */}
      <ChatbotExample activityId={activityId} />
    </div>
  );
}
```

## Props

### Chatbot

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `activityId` | `string` | ✅ | ID de l'activité pour laquelle le chatbot fournit des informations |
| `onClose` | `() => void` | ❌ | Fonction appelée quand l'utilisateur ferme le chatbot |

## Intents supportés

Le chatbot reconnaît les intentions suivantes en français:

### 1. Expliquer l'activité (`explain_activity`)
**Exemples de questions:**
- "Explique cette activité"
- "C'est quoi cette activité ?"
- "Peux-tu me décrire cette activité ?"

**Réponse:** Titre et description de l'activité

### 2. Pourquoi recommandé (`why_recommended`)
**Exemples de questions:**
- "Pourquoi je suis recommandé ?"
- "Pourquoi cette activité ?"
- "Pourquoi me suggères-tu ça ?"

**Réponse:** Score de recommandation et objectifs professionnels

### 3. Compétences développées (`skills_gained`)
**Exemples de questions:**
- "Quelles compétences vais-je développer ?"
- "Qu'est-ce que je vais apprendre ?"
- "Quelles sont les compétences ?"

**Réponse:** Liste des compétences à développer

## Suggestions rapides

Le chatbot affiche trois boutons de suggestions rapides:
1. **"Explique cette activité"** - Obtenir une description
2. **"Pourquoi recommandé ?"** - Comprendre la recommandation
3. **"Quelles compétences ?"** - Voir les compétences à développer

Ces boutons restent visibles après chaque message pour faciliter la navigation.

## Gestion des erreurs

Le chatbot gère automatiquement les erreurs suivantes:

| Erreur | Code HTTP | Message affiché |
|--------|-----------|-----------------|
| Message vide | 400 | "Message ou ID d'activité invalide" |
| Activité non trouvée | 404 | "Activité non trouvée" |
| Rasa indisponible | 503 | "Le service de chatbot est temporairement indisponible" |
| Erreur serveur | 500 | "Une erreur est survenue lors de l'envoi du message" |
| Erreur réseau | - | "Erreur de connexion au serveur" |

## Accessibilité

Le composant respecte les normes WCAG AA:

### Contraste des couleurs
- Messages utilisateur: blanc sur violet (contraste > 4.5:1)
- Messages bot: gris foncé sur blanc (contraste > 7:1)
- Boutons: gris foncé sur gris clair (contraste > 4.5:1)

### Navigation au clavier
- **Tab**: Naviguer entre les éléments interactifs
- **Entrée**: Envoyer un message depuis le champ de saisie
- **Espace**: Activer les boutons de suggestion
- **Focus visible**: Contour bleu sur l'élément actif

### Labels ARIA
- Champ de saisie: `aria-label="Message pour le chatbot"`
- Bouton envoyer: `aria-label="Envoyer le message"`
- Bouton fermer: `aria-label="Fermer le chatbot"`

## Responsive Design

Le chatbot s'adapte automatiquement à la taille de l'écran:

### Desktop (> 768px)
- Largeur maximale: 500px
- Hauteur: 600px
- Messages: 75% de largeur max

### Tablet (480px - 768px)
- Largeur: 100%
- Hauteur: 100vh (plein écran)
- Messages: 85% de largeur max

### Mobile (< 480px)
- Plein écran
- Taille de police ajustée
- Boutons de suggestion plus petits

## Styles personnalisables

Le fichier `Chatbot.css` contient toutes les classes CSS. Vous pouvez personnaliser:

### Couleurs principales
```css
/* Gradient violet (header, boutons) */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Fond des messages */
.message-bot .message-content {
  background-color: #ffffff;
}

.message-user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Dimensions
```css
.chatbot-container {
  max-width: 500px;  /* Largeur maximale */
  height: 600px;     /* Hauteur */
}
```

## Architecture technique

### Flux de données

```
User Input → Chatbot Component → chatService → Backend API → Rasa → Response
```

1. **User Input**: L'utilisateur tape un message ou clique sur une suggestion
2. **Chatbot Component**: Valide et affiche le message immédiatement
3. **chatService**: Envoie la requête HTTP au backend
4. **Backend API**: Récupère les données de l'activité et enrichit le contexte
5. **Rasa**: Analyse l'intent et génère une réponse avec variables
6. **Response**: La réponse remonte et s'affiche dans le chat

### État du composant

```typescript
interface ChatState {
  messages: Message[];      // Historique des messages
  isLoading: boolean;       // Indicateur de chargement
  error: string | null;     // Message d'erreur
  inputValue: string;       // Valeur du champ de saisie
}
```

### Types

Voir `frontend/src/types/chat.types.ts` pour tous les types TypeScript.

## Dépendances

- **React** (hooks: useState, useEffect, useRef)
- **chatService**: Service pour communiquer avec le backend
- **Types**: Interfaces TypeScript pour la sécurité des types

## Tests

### Tests unitaires
- Validation de activityId
- Affichage des messages
- Gestion des erreurs
- Boutons de suggestion

### Tests de propriétés
- Scroll automatique
- Envoi via touche Entrée
- Ajout immédiat des messages utilisateur
- Affichage du loader
- Navigation au clavier

Voir les tâches 14.x et 15.x dans le plan d'implémentation.

## Prérequis backend

Pour que le chatbot fonctionne, assurez-vous que:

1. **Rasa est démarré**:
   ```bash
   cd rasa-chatbot
   rasa run --enable-api --cors '*'
   ```

2. **Backend NestJS est démarré**:
   ```bash
   cd backend
   npm run start:dev
   ```

3. **L'activité existe** dans la base de données avec un ID valide

## Dépannage

### Le chatbot ne répond pas

**Vérifier:**
1. Rasa est démarré sur http://localhost:5005
2. Backend est démarré sur http://localhost:3000
3. L'activityId est valide
4. Pas d'erreurs dans la console du navigateur

### Messages d'erreur

**"Activité non trouvée"**
- Vérifier que l'activityId existe dans la base de données
- Vérifier le format de l'ID (doit être un ObjectId MongoDB valide)

**"Service de chatbot temporairement indisponible"**
- Vérifier que Rasa est démarré
- Vérifier les logs du backend pour les erreurs de connexion

**"Erreur de connexion au serveur"**
- Vérifier que le backend est accessible
- Vérifier la configuration CORS
- Vérifier la connexion réseau

## Améliorations futures

Fonctionnalités potentielles à ajouter:

- [ ] Historique des conversations persistant
- [ ] Support des pièces jointes
- [ ] Réactions aux messages (👍 👎)
- [ ] Mode sombre
- [ ] Traduction multilingue
- [ ] Synthèse vocale (text-to-speech)
- [ ] Reconnaissance vocale (speech-to-text)
- [ ] Suggestions contextuelles dynamiques
- [ ] Analytics des conversations

## Support

Pour toute question ou problème:
- Consulter la documentation complète: `.kiro/specs/hr-chatbot-rasa/`
- Voir les exemples: `frontend/src/components/ChatbotExample.tsx`
- Contacter l'équipe de développement

## Licence

Ce composant fait partie du système de recommandation d'activités RH.

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2024  
**Auteur**: Équipe de développement RH
