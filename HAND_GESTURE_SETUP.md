# Guide d'installation - Contrôle Gestuel

## 📋 Prérequis

- Node.js (v18 ou supérieur)
- npm ou yarn
- Une webcam fonctionnelle
- Navigateur moderne (Chrome, Firefox, Edge, Safari)

## 🚀 Installation après un `git pull`

### 1. Installer les dépendances

Les dépendances MediaPipe sont déjà dans `package.json`, il suffit de les installer:

```bash
# Dans le dossier frontend
cd frontend
npm install
```

### 2. Vérifier les dépendances installées

Les packages suivants doivent être présents:

- `@mediapipe/hands@^0.4.1675469240` - Détection des mains
- `@mediapipe/camera_utils@^0.3.1675466862` - Gestion de la caméra
- `fast-check@^4.6.0` - Tests property-based (devDependencies)

### 3. Démarrer l'application

```bash
# Dans le dossier frontend
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (ou le port configuré).

## 🎥 Configuration de la webcam

### Permissions navigateur

Au premier lancement du contrôle gestuel, le navigateur demandera l'autorisation d'accéder à la webcam. Vous devez:

1. Cliquer sur "Autoriser" quand le navigateur demande l'accès à la caméra
2. Si vous avez refusé par erreur, allez dans les paramètres du navigateur:
   - **Chrome**: `chrome://settings/content/camera`
   - **Firefox**: Cliquez sur l'icône 🔒 dans la barre d'adresse > Permissions > Caméra
   - **Edge**: `edge://settings/content/camera`

### Résolution des problèmes courants

**Erreur: "Permission caméra refusée"**
- Vérifiez les permissions dans les paramètres du navigateur
- Rechargez la page après avoir autorisé l'accès

**Erreur: "Webcam déjà utilisée"**
- Fermez les autres applications utilisant la webcam (Zoom, Teams, etc.)
- Fermez les autres onglets utilisant la caméra

**Erreur: "Aucune webcam détectée"**
- Vérifiez que votre webcam est bien connectée
- Testez la webcam dans une autre application

## 🎮 Utilisation

### Gestes reconnus

- **👍 Pouce levé (THUMBS_UP)**: Accepter une activité
- **👎 Pouce baissé (THUMBS_DOWN)**: Refuser une activité

### Comment faire les gestes

1. **Activez le contrôle gestuel** en cliquant sur le bouton "📷 Contrôle gestuel" sur une activité
2. **Positionnez votre main** devant la caméra (distance: 30-60 cm)
3. **Faites le geste** et **maintenez-le pendant 1 seconde**
4. Une barre de progression apparaîtra pour confirmer la détection
5. L'action sera exécutée automatiquement

### Conseils pour une meilleure détection

- ✅ Éclairage suffisant (évitez le contre-jour)
- ✅ Fond uni de préférence
- ✅ Main bien visible et centrée
- ✅ Fermez bien les 4 doigts (sauf le pouce) pour thumbs up/down
- ✅ Maintenez le geste stable pendant 1 seconde
- ❌ Évitez les mouvements brusques
- ❌ Ne bougez pas trop vite

## 🧪 Tests

### Lancer les tests unitaires

```bash
cd frontend
npm test
```

### Lancer les tests en mode watch

```bash
npm run test:watch
```

### Lancer les tests avec l'interface UI

```bash
npm run test:ui
```

## 📁 Fichiers du système de contrôle gestuel

### Types
- `frontend/src/types/hand-gesture.types.ts` - Définitions TypeScript

### Utilitaires
- `frontend/src/utils/gestureDetector.ts` - Détection des gestes
- `frontend/src/utils/gestureValidator.ts` - Validation et stabilité
- `frontend/src/utils/canvasRenderer.ts` - Rendu visuel des landmarks

### Services
- `frontend/src/services/recommendationService.ts` - Appels API

### Hooks
- `frontend/src/hooks/useHandGesture.ts` - Hook React pour MediaPipe

### Composants
- `frontend/src/components/HandGestureControl.tsx` - Composant principal
- `frontend/src/components/MiniHandGestureControl.tsx` - Version compacte
- `frontend/src/components/HandGestureControl.css` - Styles

### Tests
- `frontend/src/utils/gestureDetector.test.ts` - Tests unitaires

### Documentation
- `.kiro/specs/hand-gesture-control/requirements.md` - Spécifications
- `.kiro/specs/hand-gesture-control/design.md` - Design détaillé
- `.kiro/specs/hand-gesture-control/tasks.md` - Liste des tâches

## 🔧 Configuration avancée

### Ajuster les seuils de détection

Si les gestes ne sont pas bien détectés, vous pouvez ajuster les paramètres dans `frontend/src/utils/gestureDetector.ts`:

```typescript
// Seuil pour les doigts fermés (ligne ~145)
const isClosed = distance < 0.5; // Augmentez pour être plus tolérant

// Alignement vertical du pouce (lignes ~183, ~227)
const thumbVertical = Math.abs(thumbTip.x - thumbMcp.x) < 0.15; // Augmentez pour plus de tolérance
```

### Ajuster la durée de stabilité

Dans `frontend/src/utils/gestureValidator.ts`:

```typescript
private readonly STABILITY_DURATION = 1000; // Durée en ms (1 seconde)
private readonly COOLDOWN_DURATION = 2000;  // Cooldown en ms (2 secondes)
```

### Ajuster la confiance minimale

Dans `frontend/src/components/MiniHandGestureControl.tsx`:

```typescript
useHandGesture({
  onGestureDetected: handleGestureDetected,
  minConfidence: 0.7, // Réduisez à 0.6 pour être plus tolérant
});
```

## 🐛 Débogage

### Activer les logs de débogage

Les logs sont déjà activés dans le code. Ouvrez la console du navigateur (F12) pour voir:

- `✅ Main détectée!` - MediaPipe détecte votre main
- `🔎 Détection de geste avec 21 landmarks...` - Analyse en cours
- `👍 Test THUMBS_UP:` / `👎 Test THUMBS_DOWN:` - Résultats des tests
- `🤏 Test doigts fermés:` - État de chaque doigt
- `✅ THUMBS_UP détecté!` - Geste reconnu
- `🎯 Geste détecté dans MiniHandGestureControl` - Callback appelé

### Désactiver les logs

Pour désactiver les logs en production, commentez les `console.log()` dans:
- `frontend/src/utils/gestureDetector.ts`
- `frontend/src/hooks/useHandGesture.ts`
- `frontend/src/components/MiniHandGestureControl.tsx`

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez que toutes les dépendances sont installées (`npm install`)
2. Vérifiez les permissions de la webcam dans le navigateur
3. Consultez les logs dans la console (F12)
4. Vérifiez que vous utilisez un navigateur moderne et à jour
5. Testez avec un éclairage différent ou un fond différent

## 🔄 Mises à jour futures

Pour mettre à jour le système après un nouveau `git pull`:

```bash
cd frontend
npm install  # Installe les nouvelles dépendances si ajoutées
npm run dev  # Redémarre le serveur de développement
```

Aucune configuration supplémentaire n'est nécessaire - le système utilise MediaPipe via CDN.
