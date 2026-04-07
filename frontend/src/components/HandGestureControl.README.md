# Hand Gesture Control Component

Composant React pour le contrôle gestuel des recommandations RH via MediaPipe Hands.

## Installation

Les dépendances suivantes sont requises:

```bash
npm install @mediapipe/hands @mediapipe/camera_utils axios
```

## Utilisation de base

```tsx
import { HandGestureControl } from './components/HandGestureControl';

function App() {
  const [recommendations, setRecommendations] = useState([
    {
      id: 'rec-1',
      title: 'Formation React',
      description: 'Formation avancée',
      category: 'Formation',
      createdAt: new Date(),
    },
  ]);

  const handleResponse = (id: string, response: 'ACCEPTED' | 'REJECTED') => {
    console.log(`Recommandation ${id}: ${response}`);
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  return (
    <HandGestureControl
      recommendations={recommendations}
      onRecommendationResponse={handleResponse}
      authToken={yourAuthToken}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `recommendations` | `Recommendation[]` | Liste des recommandations à afficher |
| `onRecommendationResponse` | `(id: string, response: 'ACCEPTED' \| 'REJECTED') => void` | Callback appelé quand l'utilisateur répond |
| `authToken` | `string` | Token JWT pour l'authentification API |
| `className` | `string?` | Classe CSS optionnelle |

## Gestes reconnus

- 👍 **Pouce levé**: Accepter la recommandation
- 👎 **Pouce baissé**: Refuser la recommandation
- ✋ **Main ouverte**: Détecté mais sans action
- ✊ **Poing fermé**: Détecté mais sans action

## Fonctionnement

1. **Activation**: Cliquez sur "Activer la caméra" pour démarrer
2. **Détection**: Montrez votre main face à la caméra
3. **Validation**: Maintenez le geste pendant 1 seconde
4. **Action**: Le système envoie automatiquement la réponse à l'API
5. **Cooldown**: Attendez 2 secondes avant le prochain geste

## Accessibilité

- Navigation clavier complète (Tab, Enter, Space)
- Attributs ARIA pour les lecteurs d'écran
- Boutons alternatifs "Accepter" et "Refuser"
- Tooltips explicatifs sur tous les éléments interactifs

## Gestion des erreurs

Le composant gère automatiquement:
- Permission caméra refusée
- Webcam non disponible
- Erreurs MediaPipe
- Erreurs réseau et API
- Token JWT expiré (avec refresh automatique)

## Performance

- Traitement à 15+ FPS sur configurations standards
- Pause automatique quand l'onglet est inactif
- Adaptation automatique de la résolution si performances dégradées
- Libération complète des ressources au démontage

## Compatibilité

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+ (support partiel)

## API Backend

Le composant utilise l'endpoint existant:

```
POST /api/recommendations/respond
Content-Type: application/json
Authorization: Bearer <token>

{
  "recommendationId": "rec-123",
  "response": "ACCEPTED" | "REJECTED",
  "justification": "Geste détecté: pouce levé"
}
```

## Personnalisation

Vous pouvez personnaliser l'apparence via CSS:

```css
.hand-gesture-control {
  /* Vos styles personnalisés */
}
```

## Dépannage

### La caméra ne démarre pas
- Vérifiez que vous êtes en HTTPS (requis pour la webcam)
- Vérifiez les permissions du navigateur
- Vérifiez qu'aucune autre application n'utilise la webcam

### Les gestes ne sont pas détectés
- Assurez-vous que votre main est bien visible
- Vérifiez l'éclairage (évitez les contre-jours)
- Maintenez votre main à 30-60cm de la caméra
- Vérifiez que le score de confiance est > 70%

### Performances dégradées
- Fermez les autres onglets/applications
- Réduisez la résolution de la webcam
- Vérifiez que votre navigateur est à jour
