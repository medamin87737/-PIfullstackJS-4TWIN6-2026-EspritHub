# Guide des Stories Conversationnelles

## Vue d'ensemble

Ce document décrit les parcours conversationnels (stories) définis pour le chatbot RH. Les stories permettent à Rasa de gérer des dialogues cohérents et naturels avec les utilisateurs.

## Structure des Stories

Chaque story définit un parcours conversationnel typique avec:
- **intent**: L'intention de l'utilisateur (ce qu'il veut faire)
- **action**: La réponse du bot (ce qu'il fait en retour)

## Stories Implémentées

### 1. Conversations avec Salutation (3 stories)

Ces stories commencent par un salut de l'utilisateur:

#### 1.1 Salut + Explication d'activité
```yaml
- intent: greet
- action: utter_greet
- intent: explain_activity
- action: utter_explain_activity
```

#### 1.2 Salut + Pourquoi recommandé
```yaml
- intent: greet
- action: utter_greet
- intent: why_recommended
- action: utter_why_recommended
```

#### 1.3 Salut + Compétences développées
```yaml
- intent: greet
- action: utter_greet
- intent: skills_gained
- action: utter_skills_gained
```

### 2. Questions Directes (3 stories)

Ces stories permettent aux utilisateurs de poser directement une question sans salutation:

#### 2.1 Question directe: Explication
```yaml
- intent: explain_activity
- action: utter_explain_activity
```

#### 2.2 Question directe: Pourquoi recommandé
```yaml
- intent: why_recommended
- action: utter_why_recommended
```

#### 2.3 Question directe: Compétences
```yaml
- intent: skills_gained
- action: utter_skills_gained
```

### 3. Conversations Multi-Questions (7 stories)

Ces stories gèrent les conversations où l'utilisateur pose plusieurs questions enchaînées:

#### 3.1 Flux complet (explain → skills → why → goodbye)
```yaml
- intent: explain_activity
- action: utter_explain_activity
- intent: skills_gained
- action: utter_skills_gained
- intent: why_recommended
- action: utter_why_recommended
- intent: goodbye
- action: utter_goodbye
```

#### 3.2 Conversation complète avec salutation
```yaml
- intent: greet
- action: utter_greet
- intent: explain_activity
- action: utter_explain_activity
- intent: why_recommended
- action: utter_why_recommended
- intent: skills_gained
- action: utter_skills_gained
- intent: goodbye
- action: utter_goodbye
```

#### 3.3 Question rapide + au revoir
```yaml
- intent: skills_gained
- action: utter_skills_gained
- intent: goodbye
- action: utter_goodbye
```

#### 3.4 Pourquoi recommandé → Compétences
```yaml
- intent: why_recommended
- action: utter_why_recommended
- intent: skills_gained
- action: utter_skills_gained
```

#### 3.5 Compétences → Explication
```yaml
- intent: skills_gained
- action: utter_skills_gained
- intent: explain_activity
- action: utter_explain_activity
```

#### 3.6 Explication → Pourquoi → Au revoir
```yaml
- intent: explain_activity
- action: utter_explain_activity
- intent: why_recommended
- action: utter_why_recommended
- intent: goodbye
- action: utter_goodbye
```

#### 3.7 Toutes les questions dans un ordre différent
```yaml
- intent: skills_gained
- action: utter_skills_gained
- intent: explain_activity
- action: utter_explain_activity
- intent: why_recommended
- action: utter_why_recommended
```

## Couverture des Exigences

### Exigence 14.1: Story pour explain_activity ✅
- Story directe sans salutation
- Story avec salutation
- Inclus dans les flux multi-questions

### Exigence 14.2: Story pour why_recommended ✅
- Story directe sans salutation
- Story avec salutation
- Inclus dans les flux multi-questions

### Exigence 14.3: Story pour skills_gained ✅
- Story directe sans salutation
- Story avec salutation
- Inclus dans les flux multi-questions

### Exigence 14.4: Stories pour questions multiples enchaînées ✅
- 7 stories différentes couvrant diverses combinaisons
- Support de l'ordre flexible des questions
- Gestion des conversations courtes et longues

## Intents Supportés

| Intent | Description | Exemple |
|--------|-------------|---------|
| `greet` | Salutation | "Bonjour", "Salut" |
| `goodbye` | Au revoir | "Au revoir", "Bye" |
| `explain_activity` | Demande d'explication | "Explique cette activité" |
| `why_recommended` | Raison de la recommandation | "Pourquoi recommandé ?" |
| `skills_gained` | Compétences développées | "Quelles compétences ?" |

## Actions Correspondantes

| Action | Description | Variables utilisées |
|--------|-------------|---------------------|
| `utter_greet` | Message de bienvenue | - |
| `utter_goodbye` | Message d'au revoir | - |
| `utter_explain_activity` | Explication de l'activité | `{titre}`, `{description}` |
| `utter_why_recommended` | Raison de la recommandation | `{score}`, `{objectif}` |
| `utter_skills_gained` | Compétences à développer | `{competences}` |

## Flexibilité des Conversations

Les stories définies permettent:

1. **Conversations courtes**: Une seule question puis fin
2. **Conversations moyennes**: 2-3 questions enchaînées
3. **Conversations longues**: Toutes les questions + salutation + au revoir
4. **Ordre flexible**: Les questions peuvent être posées dans n'importe quel ordre
5. **Avec ou sans salutation**: L'utilisateur peut commencer directement par une question

## Tests de Validation

Un fichier de test complet (`tests/test_stories_completeness.py`) vérifie:
- ✅ Présence de stories pour chaque intent principal
- ✅ Présence de stories multi-questions
- ✅ Chaque story a au moins un intent et une action
- ✅ Support des questions directes sans salutation
- ✅ Support des conversations avec salutation
- ✅ Présence du flux goodbye

## Utilisation

Ces stories sont utilisées par Rasa pour:
1. **Entraînement**: Apprendre les patterns de conversation
2. **Prédiction**: Déterminer la prochaine action appropriée
3. **Gestion du dialogue**: Maintenir le contexte conversationnel

## Maintenance

Pour ajouter une nouvelle story:
1. Identifier le parcours conversationnel à supporter
2. Ajouter la story dans `data/stories.yml`
3. Vérifier que les intents et actions existent dans `domain.yml`
4. Exécuter les tests: `pytest tests/test_stories_completeness.py`
5. Réentraîner le modèle: `rasa train`

## Références

- **Requirements**: Exigences 14.1, 14.2, 14.3, 14.4
- **Design Document**: Section "Configuration Rasa Stories"
- **Domain**: `domain.yml`
- **NLU Examples**: `data/nlu.yml`
