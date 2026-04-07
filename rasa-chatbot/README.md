# Chatbot RH Intelligent - Configuration Rasa

Ce répertoire contient la configuration du moteur NLP Rasa pour le chatbot RH intelligent. Le chatbot permet aux employés de poser des questions en français sur les activités recommandées.

## 🚀 Démarrage Rapide

### Option 1: Script Automatique (Recommandé)
```cmd
start-rasa.cmd
```
ou
```powershell
.\start-rasa.ps1
```

### Option 2: Démarrage Manuel
```cmd
# Terminal 1 - Actions Server (IMPORTANT: démarrer en premier)
rasa run actions

# Terminal 2 - Rasa Server
rasa train
rasa run --enable-api --cors "*"
```

**📚 Voir `QUICK_START.md` pour le guide complet de démarrage**

---

## Structure du Projet

```
rasa-chatbot/
├── config.yml          # Configuration du pipeline NLP pour le français
├── domain.yml          # Définition des intents, actions, slots et réponses
├── endpoints.yml       # Configuration du serveur d'actions
├── data/
│   ├── nlu.yml        # Exemples d'entraînement pour la reconnaissance d'intentions
│   └── stories.yml    # Parcours conversationnels
├── actions/           # ✨ Actions personnalisées (logique métier)
│   ├── __init__.py
│   └── actions.py     # Actions pour gérer les réponses dynamiques
├── models/            # Modèles entraînés (généré après rasa train)
├── start-rasa.cmd     # Script de démarrage Windows (CMD)
├── start-rasa.ps1     # Script de démarrage Windows (PowerShell)
├── test-chatbot.cmd   # Script de test rapide
├── QUICK_START.md     # Guide de démarrage rapide
└── README.md          # Ce fichier
```

## Prérequis

- **Python 3.10** (requis par Rasa)
- pip (gestionnaire de paquets Python)

**⚠️ Important**: Rasa nécessite Python 3.10. Si vous utilisez une autre version, consultez le guide de configuration: [PYTHON_VERSION_SETUP.md](PYTHON_VERSION_SETUP.md)

## Installation

1. Installer Rasa:

```bash
pip install rasa
```

2. Vérifier l'installation:

```bash
rasa --version
```

## Configuration

### Intents Supportés

Le chatbot reconnaît les intentions suivantes en français:

- **greet**: Salutations (bonjour, salut, etc.)
- **goodbye**: Au revoir (au revoir, bye, etc.)
- **explain_activity**: Demande d'explication de l'activité
- **why_recommended**: Demande de raison de la recommandation
- **skills_gained**: Demande sur les compétences à développer
- **ask_duration**: Demande sur la durée de l'activité ✨ NOUVEAU
- **ask_location**: Demande sur le lieu de l'activité ✨ NOUVEAU
- **ask_date**: Demande sur les dates de l'activité ✨ NOUVEAU

### Actions Personnalisées

Le chatbot utilise des actions personnalisées pour générer des réponses dynamiques:

- **action_explain_activity**: Explique l'activité avec titre et description
- **action_why_recommended**: Explique pourquoi l'activité est recommandée
- **action_skills_gained**: Liste les compétences à développer
- **action_ask_duration**: Donne la durée de l'activité
- **action_ask_location**: Donne le lieu de l'activité
- **action_ask_date**: Donne les dates de début et fin

### Slots Contextuels

Les slots suivants sont utilisés pour personnaliser les réponses:

- **titre**: Titre de l'activité
- **description**: Description de l'activité
- **competences**: Liste des compétences à développer
- **score**: Score de recommandation (0-100)
- **objectif**: Objectif professionnel associé

Ces slots sont remplis dynamiquement par les actions personnalisées qui récupèrent les données depuis le metadata envoyé par le backend NestJS.

## Entraînement du Modèle

1. Valider la configuration:

```bash
cd rasa-chatbot
rasa data validate
```

2. Entraîner le modèle:

```bash
rasa train
```

Cette commande crée un modèle entraîné dans le répertoire `models/`.

## Démarrage du Serveur

**⚠️ IMPORTANT**: Vous devez démarrer DEUX serveurs dans cet ordre:

### 1. Serveur d'Actions (Port 5055) - À démarrer EN PREMIER

```bash
rasa run actions
```

Ce serveur exécute les actions personnalisées qui génèrent les réponses dynamiques.

### 2. Serveur Rasa (Port 5005) - À démarrer EN SECOND

```bash
rasa run --enable-api --cors '*'
```

Le serveur sera accessible sur `http://localhost:5005`.

### Script Automatique

Pour démarrer les deux serveurs automatiquement:

```cmd
start-rasa.cmd
```

ou

```powershell
.\start-rasa.ps1
```

### Options de Démarrage

- `--enable-api`: Active l'API REST pour les webhooks
- `--cors '*'`: Autorise les requêtes CORS de toutes les origines
- `--port 5005`: Port du serveur (5005 par défaut)
- `--debug`: Mode debug avec logs détaillés

## Test du Chatbot

### Checkpoint de Validation

Avant de passer à l'intégration backend, suivez le guide de checkpoint complet:

📋 **[Guide de Test Checkpoint](docs/CHECKPOINT_TESTING_GUIDE.md)** - Guide détaillé avec tous les tests de validation

⚡ **[Commandes de Test Rapide](docs/QUICK_TEST_COMMANDS.md)** - Référence rapide des commandes curl essentielles

### Test Interactif en Shell

Pour tester le chatbot en mode interactif:

```bash
rasa shell
```

Exemples de messages à tester:
- "Bonjour"
- "Explique cette activité"
- "Pourquoi je suis recommandé ?"
- "Quelles compétences vais-je développer ?"
- "Au revoir"

### Test via API REST

Une fois le serveur démarré, vous pouvez tester l'API avec curl:

```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test_user",
    "message": "Explique cette activité",
    "metadata": {
      "activity": {
        "titre": "Formation React Avancé",
        "description": "Apprenez les concepts avancés de React",
        "competences": ["React", "JavaScript", "TypeScript"],
        "score": 85,
        "objectif": "Développer vos compétences frontend"
      }
    }
  }'
```

### Tests Automatisés

Pour exécuter les tests automatisés:

```bash
# Tester les NLU (reconnaissance d'intentions)
rasa test nlu

# Tester les stories (parcours conversationnels)
rasa test core

# Tester tout
rasa test
```

## Intégration avec le Backend

Le backend NestJS communique avec Rasa via le webhook REST:

**Endpoint**: `POST http://localhost:5005/webhooks/rest/webhook`

**Format de requête**:
```json
{
  "sender": "user_id",
  "message": "Message de l'utilisateur",
  "metadata": {
    "activity": {
      "titre": "Titre de l'activité",
      "description": "Description",
      "competences": ["Compétence 1", "Compétence 2"],
      "score": 85,
      "objectif": "Objectif professionnel"
    }
  }
}
```

**Format de réponse**:
```json
[
  {
    "recipient_id": "user_id",
    "text": "Réponse du chatbot"
  }
]
```

## Personnalisation

### Ajouter de Nouveaux Intents

1. Ajouter l'intent dans `domain.yml`:
```yaml
intents:
  - nouvel_intent
```

2. Ajouter des exemples dans `data/nlu.yml`:
```yaml
- intent: nouvel_intent
  examples: |
    - exemple 1
    - exemple 2
```

3. Ajouter une réponse dans `domain.yml`:
```yaml
responses:
  utter_nouvel_intent:
    - text: "Réponse pour le nouvel intent"
```

4. Ajouter des stories dans `data/stories.yml`:
```yaml
- story: nouvel intent path
  steps:
    - intent: nouvel_intent
    - action: utter_nouvel_intent
```

5. Réentraîner le modèle:
```bash
rasa train
```

### Modifier les Réponses

Les réponses sont définies dans `domain.yml` sous la section `responses`. Vous pouvez:
- Ajouter plusieurs variations de réponses
- Utiliser des variables avec `{nom_variable}`
- Créer des réponses conditionnelles

## Dépannage

### Le serveur ne démarre pas

- Vérifiez que le port 5005 n'est pas déjà utilisé
- Vérifiez que Rasa est correctement installé: `rasa --version`
- Vérifiez les logs pour les erreurs de configuration

### Les intents ne sont pas reconnus

- Vérifiez que le modèle est entraîné: `rasa train`
- Ajoutez plus d'exemples d'entraînement dans `data/nlu.yml`
- Testez avec `rasa shell` pour voir les scores de confiance

### Les variables ne sont pas remplacées

- Vérifiez que les slots sont correctement définis dans `domain.yml`
- Vérifiez que le backend envoie les données dans `metadata.activity`
- Les noms de variables doivent correspondre exactement aux noms des slots

## Ressources

- [Documentation Rasa](https://rasa.com/docs/)
- [Rasa NLU Training Data](https://rasa.com/docs/rasa/training-data-format)
- [Rasa Stories](https://rasa.com/docs/rasa/stories)
- [Rasa HTTP API](https://rasa.com/docs/rasa/pages/http-api)

## Support

Pour toute question ou problème, consultez:
- La documentation du projet dans `/docs`
- Les spécifications dans `.kiro/specs/hr-chatbot-rasa/`
- L'équipe de développement
