# Document de Conception - Chatbot RH Intelligent avec Rasa

## Vue d'Ensemble

Ce document décrit la conception technique pour l'intégration d'un chatbot RH intelligent dans une application React + NestJS existante, utilisant Rasa comme moteur NLP. Le système permettra aux employés d'interagir en langage naturel (français) pour obtenir des informations contextuelles sur les activités recommandées.

### Objectifs de Conception

- Intégration non-invasive sans modification de la base de données existante
- Architecture modulaire et maintenable
- Communication efficace entre React, NestJS et Rasa
- Expérience utilisateur fluide et réactive
- Gestion robuste des erreurs et des données manquantes

### Contraintes Techniques

- Utilisation de Rasa comme moteur NLP (pas de développement NLP from scratch)
- Pas de modification du schéma de base de données
- Support du français comme langue principale
- Compatibilité avec l'architecture React + NestJS existante
- Rasa exécuté localement sur http://localhost:5005

## Architecture

### Architecture Globale

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │◄───────►│  NestJS Backend  │◄───────►│  Rasa NLP       │
│  (Chatbot UI)   │  HTTP   │  (Chat API)      │  HTTP   │  (localhost:    │
│                 │         │                  │         │   5005)         │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │
                                     ▼
                            ┌──────────────────┐
                            │                  │
                            │  Database        │
                            │  (Activities)    │
                            │                  │
                            └──────────────────┘
```

### Flux de Données

1. L'utilisateur saisit un message dans le composant React Chatbot
2. Le frontend envoie `{message, activityId}` à POST /api/chat
3. Le backend récupère les données de l'activité depuis la base de données
4. Le backend enrichit le message avec le contexte (titre, description, compétences, score)
5. Le backend envoie la requête enrichie à Rasa via webhook REST
6. Rasa analyse l'intent et génère une réponse avec les variables contextuelles
7. Le backend retourne la réponse à React
8. React affiche la réponse dans l'interface de chat


## Composants et Interfaces

### Backend NestJS

#### ChatController

Responsable de la gestion des routes HTTP pour le chatbot.

```typescript
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(@Body() dto: ChatMessageDto): Promise<ChatResponseDto> {
    return await this.chatService.processMessage(dto);
  }
}
```

#### ChatMessageDto

```typescript
export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  activityId: string;
}
```

#### ChatResponseDto

```typescript
export class ChatResponseDto {
  message: string;
  timestamp: Date;
  success: boolean;
}
```

#### ChatService

Contient la logique métier pour le traitement des messages.

```typescript
export class ChatService {
  constructor(
    private readonly httpService: HttpService,
    private readonly activityService: ActivityService,
    private readonly logger: Logger
  ) {}

  async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
    // 1. Récupérer les données de l'activité
    const activity = await this.getActivityData(dto.activityId);
    
    // 2. Enrichir le contexte
    const enrichedContext = this.enrichContext(activity);
    
    // 3. Envoyer à Rasa
    const rasaResponse = await this.sendToRasa(dto.message, enrichedContext);
    
    // 4. Retourner la réponse
    return {
      message: rasaResponse,
      timestamp: new Date(),
      success: true
    };
  }

  private async getActivityData(activityId: string): Promise<Activity> {
    // Récupération depuis la base de données
  }

  private enrichContext(activity: Activity): RasaContext {
    // Construction du contexte enrichi
  }

  private async sendToRasa(message: string, context: RasaContext): Promise<string> {
    // Communication avec Rasa webhook
  }
}
```

#### RasaContext Interface

```typescript
interface RasaContext {
  titre: string;
  description: string;
  competences: string[];
  score?: number;
  objectif?: string;
}
```

#### Rasa Request Payload

```typescript
interface RasaWebhookRequest {
  sender: string;
  message: string;
  metadata?: {
    activity: RasaContext;
  };
}
```

#### Rasa Response Format

```typescript
interface RasaWebhookResponse {
  recipient_id: string;
  text: string;
}[]
```

### Frontend React

#### Chatbot Component

Composant principal qui gère l'interface de chat.

```typescript
interface ChatbotProps {
  activityId: string;
  onClose?: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const Chatbot: React.FC<ChatbotProps> = ({ activityId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gestion de l'envoi de message
  const handleSendMessage = async (text: string) => {
    // Logique d'envoi
  };

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    // JSX de l'interface
  );
};
```

#### ChatService (Frontend)

Service pour les appels API.

```typescript
export class ChatService {
  private readonly baseUrl = '/api/chat';

  async sendMessage(message: string, activityId: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, activityId }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return data.message;
  }
}
```

#### Quick Suggestions Component

```typescript
interface QuickSuggestion {
  id: string;
  text: string;
  displayText: string;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { id: '1', text: 'Explique cette activité', displayText: 'Explique cette activité' },
  { id: '2', text: 'Pourquoi je suis recommandé ?', displayText: 'Pourquoi recommandé ?' },
  { id: '3', text: 'Quelles compétences vais-je développer ?', displayText: 'Quelles compétences ?' },
];
```

### Configuration Rasa

#### Structure du Projet Rasa

```
rasa-chatbot/
├── config.yml          # Configuration du pipeline NLP
├── domain.yml          # Définition des intents, réponses, slots
├── data/
│   ├── nlu.yml        # Exemples d'entraînement
│   └── stories.yml    # Parcours conversationnels
├── actions/           # Actions personnalisées (si nécessaire)
└── models/            # Modèles entraînés
```

#### config.yml

Configuration du pipeline NLP pour le français.

```yaml
language: fr
pipeline:
  - name: WhitespaceTokenizer
  - name: RegexFeaturizer
  - name: LexicalSyntacticFeaturizer
  - name: CountVectorsFeaturizer
  - name: CountVectorsFeaturizer
    analyzer: char_wb
    min_ngram: 1
    max_ngram: 4
  - name: DIETClassifier
    epochs: 100
    constrain_similarities: true
  - name: EntitySynonymMapper
  - name: ResponseSelector
    epochs: 100
    constrain_similarities: true
  - name: FallbackClassifier
    threshold: 0.3
    ambiguity_threshold: 0.1

policies:
  - name: MemoizationPolicy
  - name: RulePolicy
  - name: UnexpecTEDIntentPolicy
    max_history: 5
    epochs: 100
  - name: TEDPolicy
    max_history: 5
    epochs: 100
    constrain_similarities: true
```

#### domain.yml

Définition des intents, slots et réponses.

```yaml
version: "3.1"

intents:
  - explain_activity
  - why_recommended
  - skills_gained
  - greet
  - goodbye

slots:
  titre:
    type: text
    mappings:
      - type: custom
  description:
    type: text
    mappings:
      - type: custom
  competences:
    type: list
    mappings:
      - type: custom
  score:
    type: float
    mappings:
      - type: custom
  objectif:
    type: text
    mappings:
      - type: custom

responses:
  utter_greet:
    - text: "Bonjour ! Je suis votre assistant RH. Comment puis-je vous aider avec cette activité ?"

  utter_goodbye:
    - text: "Au revoir ! N'hésitez pas à revenir si vous avez d'autres questions."

  utter_explain_activity:
    - text: "Cette activité s'intitule '{titre}'. {description}"
    - text: "Voici les détails de l'activité '{titre}' : {description}"
    
  utter_explain_activity_no_description:
    - text: "Cette activité s'intitule '{titre}'. Malheureusement, je n'ai pas plus de détails pour le moment. Contactez les RH pour en savoir plus."

  utter_why_recommended:
    - text: "Cette activité vous est recommandée avec un score de {score}%. Elle correspond à vos objectifs professionnels : {objectif}."
    - text: "Vous avez été recommandé pour cette activité car elle correspond à {objectif}, avec un score de pertinence de {score}%."

  utter_why_recommended_no_score:
    - text: "Cette activité vous est recommandée car elle correspond à vos objectifs professionnels : {objectif}."
    - text: "Cette activité a été sélectionnée pour vous aider à atteindre vos objectifs : {objectif}."

  utter_skills_gained:
    - text: "En participant à cette activité, vous développerez les compétences suivantes : {competences}."
    - text: "Cette activité vous permettra d'acquérir ces compétences : {competences}."

  utter_skills_gained_no_data:
    - text: "Les compétences spécifiques pour cette activité ne sont pas encore définies. Contactez les RH pour plus d'informations."

  utter_default:
    - text: "Je ne suis pas sûr de comprendre. Vous pouvez me demander d'expliquer l'activité, pourquoi elle vous est recommandée, ou quelles compétences vous allez développer."
```

#### data/nlu.yml

Exemples d'entraînement pour chaque intent.

```yaml
version: "3.1"

nlu:
  - intent: greet
    examples: |
      - bonjour
      - salut
      - hello
      - coucou
      - bonsoir

  - intent: goodbye
    examples: |
      - au revoir
      - bye
      - à bientôt
      - salut
      - ciao

  - intent: explain_activity
    examples: |
      - Explique cette activité
      - C'est quoi cette activité ?
      - Peux-tu me décrire cette activité ?
      - Qu'est-ce que c'est ?
      - Dis-moi ce que c'est
      - Donne-moi des détails sur cette activité
      - Parle-moi de cette activité
      - Décris-moi l'activité
      - Je veux en savoir plus sur cette activité
      - Qu'est-ce que cette activité propose ?
      - C'est quoi exactement ?
      - Explique-moi
      - Détails de l'activité
      - Informations sur l'activité

  - intent: why_recommended
    examples: |
      - Pourquoi je suis recommandé ?
      - Pourquoi cette activité ?
      - Pourquoi me suggères-tu ça ?
      - Pourquoi moi ?
      - Quelle est la raison de cette recommandation ?
      - Pourquoi cette activité m'est proposée ?
      - Pourquoi tu me recommandes ça ?
      - Pourquoi est-ce que je devrais faire ça ?
      - Qu'est-ce qui justifie cette recommandation ?
      - Sur quoi se base cette recommandation ?
      - Pourquoi c'est pertinent pour moi ?
      - En quoi ça me concerne ?
      - Raison de la recommandation

  - intent: skills_gained
    examples: |
      - Quelles compétences vais-je développer ?
      - Qu'est-ce que je vais apprendre ?
      - Quelles sont les compétences ?
      - Qu'est-ce que ça va m'apporter ?
      - Quelles compétences je vais acquérir ?
      - Que vais-je apprendre ?
      - Compétences développées
      - Qu'est-ce que je vais gagner ?
      - Quels sont les bénéfices ?
      - Qu'est-ce que ça va m'apprendre ?
      - Quelles compétences ça développe ?
      - Apprentissages de cette activité
      - Compétences acquises
```

#### data/stories.yml

Parcours conversationnels.

```yaml
version: "3.1"

stories:
  - story: explain activity path
    steps:
      - intent: greet
      - action: utter_greet
      - intent: explain_activity
      - action: utter_explain_activity

  - story: why recommended path
    steps:
      - intent: greet
      - action: utter_greet
      - intent: why_recommended
      - action: utter_why_recommended

  - story: skills gained path
    steps:
      - intent: greet
      - action: utter_greet
      - intent: skills_gained
      - action: utter_skills_gained

  - story: direct question without greeting
    steps:
      - intent: explain_activity
      - action: utter_explain_activity

  - story: multiple questions
    steps:
      - intent: explain_activity
      - action: utter_explain_activity
      - intent: skills_gained
      - action: utter_skills_gained
      - intent: why_recommended
      - action: utter_why_recommended
      - intent: goodbye
      - action: utter_goodbye
```


## Modèles de Données

### Activity Model (Existant)

Le modèle Activity existe déjà dans la base de données. Nous l'utilisons en lecture seule.

```typescript
interface Activity {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  recommendationScore?: number;
  objective?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Model (Frontend uniquement)

Utilisé uniquement dans l'état React, pas persisté.

```typescript
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}
```

### ChatState (Frontend uniquement)

```typescript
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  activityId: string;
}
```

### Rasa Slot Mapping

Les données de l'activité sont mappées vers les slots Rasa :

| Champ Activity | Slot Rasa | Type | Transformation |
|----------------|-----------|------|----------------|
| title | titre | text | Direct |
| description | description | text | Direct |
| requiredSkills | competences | list | Join avec ", " |
| recommendationScore | score | float | Direct |
| objective | objectif | text | Direct ou valeur par défaut |

### Gestion des Données Manquantes

```typescript
function mapActivityToRasaContext(activity: Activity): RasaContext {
  return {
    titre: activity.title || 'Activité sans titre',
    description: activity.description || '',
    competences: activity.requiredSkills || [],
    score: activity.recommendationScore,
    objectif: activity.objective || 'votre développement professionnel'
  };
}
```


## Propriétés de Correction

*Une propriété est une caractéristique ou un comportement qui doit être vrai pour toutes les exécutions valides d'un système - essentiellement, une déclaration formelle sur ce que le système doit faire. Les propriétés servent de pont entre les spécifications lisibles par l'homme et les garanties de correction vérifiables par machine.*

### Propriétés Backend (NestJS)

**Property 1: Validation des payloads valides**
*Pour tout* payload JSON contenant des champs message (string non-vide) et activityId (string non-vide), l'endpoint POST /api/chat doit accepter la requête et retourner un code 200.
**Valide: Exigences 1.2, 1.5**

**Property 2: Rejet des payloads invalides**
*Pour tout* payload JSON où message ou activityId est vide, absent, ou d'un type incorrect, l'endpoint POST /api/chat doit retourner une erreur 400 avec un message descriptif.
**Valide: Exigences 1.3, 1.4**

**Property 3: Récupération des données d'activité**
*Pour tout* activityId valide existant dans la base de données, le Backend_API doit récupérer l'activité correspondante avec tous ses champs (titre, description, compétences, score).
**Valide: Exigences 2.1, 2.2**

**Property 4: Enrichissement du contexte**
*Pour toute* activité récupérée, le Backend_API doit créer un objet RasaContext contenant les champs titre, description, competences, score et objectif, avec des valeurs par défaut appropriées pour les champs manquants.
**Valide: Exigences 2.4, 2.5**

**Property 5: Communication avec Rasa**
*Pour toute* requête de chat valide, le Backend_API doit envoyer une requête HTTP POST à http://localhost:5005/webhooks/rest/webhook incluant le message utilisateur et le contexte enrichi dans le payload.
**Valide: Exigences 3.1, 3.2**

**Property 6: Extraction de la réponse Rasa**
*Pour toute* réponse valide de Rasa (tableau de messages), le Backend_API doit extraire le texte du premier message ou combiner les messages multiples en une seule réponse.
**Valide: Exigences 3.3, 3.6**

**Property 7: Gestion des erreurs Rasa**
*Pour toute* erreur de connexion à Rasa, le Backend_API doit retourner une erreur 503. Pour toute erreur 4xx/5xx de Rasa, le Backend_API doit logger l'erreur et retourner une erreur 500.
**Valide: Exigences 3.4, 3.5**

**Property 8: Logging des erreurs**
*Pour toute* erreur (communication Rasa, validation, activité non trouvée), le Backend_API doit créer une entrée de log contenant un timestamp, un niveau de sévérité, et les détails de l'erreur sans données sensibles.
**Valide: Exigences 15.1, 15.2, 15.3, 15.4, 15.5**

**Property 9: Lecture seule de la base de données**
*Pour toute* opération du chatbot, le système ne doit effectuer que des opérations de lecture (SELECT) sur la table Activity, jamais d'opérations d'écriture (INSERT, UPDATE, DELETE).
**Valide: Exigences 16.4**

### Propriétés Rasa (Configuration NLP)

**Property 10: Complétude des exemples d'entraînement**
*Pour chaque* intent défini (explain_activity, why_recommended, skills_gained), le fichier nlu.yml doit contenir au minimum 10 exemples d'entraînement en français.
**Valide: Exigences 4.4**

**Property 11: Diversité des exemples (ponctuation)**
*Pour chaque* intent, les exemples d'entraînement doivent inclure au moins une variation avec ponctuation et une variation sans ponctuation.
**Valide: Exigences 5.4**

**Property 12: Diversité des exemples (tutoiement/vouvoiement)**
*Pour chaque* intent, les exemples d'entraînement doivent inclure au moins une variation avec tutoiement et une variation avec vouvoiement.
**Valide: Exigences 5.5**

**Property 13: Gestion des données manquantes dans les réponses**
*Pour toute* combinaison de données contextuelles (avec ou sans score, compétences, description), Rasa doit fournir une réponse appropriée sans afficher de valeurs vides ou undefined, en utilisant des réponses alternatives ou des valeurs par défaut.
**Valide: Exigences 6.4, 7.1, 7.2, 7.3, 7.5**

**Property 14: Structure des stories**
*Pour chaque* story définie dans stories.yml, la story doit contenir au moins un intent utilisateur et une action de réponse correspondante.
**Valide: Exigences 14.4**

### Propriétés Frontend (React)

**Property 15: Alignement des messages**
*Pour tout* message affiché, si le sender est 'user', le message doit être aligné à droite avec un style distinct; si le sender est 'bot', le message doit être aligné à gauche avec un style distinct.
**Valide: Exigences 8.2, 8.3**

**Property 16: Scroll automatique**
*Pour tout* nouveau message ajouté au tableau de messages, l'interface doit automatiquement scroller vers le bas pour afficher le dernier message.
**Valide: Exigences 8.6**

**Property 17: Affichage du loader**
*Pour toute* requête envoyée au backend, l'interface doit afficher un indicateur de chargement visible et désactiver le champ de saisie et le bouton d'envoi jusqu'à réception de la réponse.
**Valide: Exigences 8.7, 11.1, 11.3, 11.4, 11.5**

**Property 18: Responsive design**
*Pour toute* largeur de viewport (mobile: 320px-768px, desktop: >768px), l'interface du chatbot doit s'afficher correctement sans débordement horizontal et avec tous les éléments accessibles.
**Valide: Exigences 8.8**

**Property 19: Envoi via suggestions**
*Pour tout* bouton de suggestion cliqué, l'interface doit automatiquement envoyer le message correspondant au backend et afficher le message dans la zone de chat.
**Valide: Exigences 9.5**

**Property 20: Persistance des suggestions**
*Pour tout* message envoyé (via input ou suggestion), les boutons de suggestions doivent rester visibles dans l'interface pour permettre d'autres questions.
**Valide: Exigences 9.6**

**Property 21: Structure du payload API**
*Pour tout* message envoyé au backend, le payload doit contenir exactement deux champs: message (string) et activityId (string).
**Valide: Exigences 10.2**

**Property 22: Affichage des réponses du bot**
*Pour toute* réponse reçue du backend avec succès, l'interface doit ajouter un nouveau message avec sender='bot' et le texte de la réponse dans la zone de messages.
**Valide: Exigences 10.3**

**Property 23: Gestion des erreurs réseau**
*Pour toute* erreur réseau (timeout, connexion refusée) ou erreur HTTP (4xx, 5xx), l'interface doit afficher un message d'erreur convivial dans la zone de chat et réactiver les contrôles.
**Valide: Exigences 10.4, 10.5**

**Property 24: Désactivation pendant le chargement**
*Pour toute* période où isLoading est true, le bouton d'envoi doit avoir l'attribut disabled=true.
**Valide: Exigences 10.6**

**Property 25: Envoi via touche Entrée**
*Pour tout* événement keypress sur le champ de saisie où la touche est 'Enter' et le champ n'est pas vide, le message doit être envoyé immédiatement.
**Valide: Exigences 18.1**

**Property 26: Ajout immédiat des messages utilisateur**
*Pour tout* message envoyé par l'utilisateur, le message doit être ajouté instantanément au tableau de messages avec sender='user' avant même de recevoir la réponse du backend.
**Valide: Exigences 18.2**

**Property 27: Temps de réponse**
*Pour toute* requête de chat dans des conditions normales (Rasa disponible, activité existante), le temps entre l'envoi et la réception de la réponse doit être inférieur à 3 secondes.
**Valide: Exigences 18.3**

**Property 28: Navigation au clavier**
*Pour tout* élément interactif du chatbot (input, boutons), l'élément doit être accessible via la touche Tab et activable via la touche Entrée ou Espace.
**Valide: Exigences 19.4**

**Property 29: Contraste des couleurs**
*Pour tout* élément de texte et son arrière-plan, le ratio de contraste doit être au minimum 4.5:1 pour respecter les normes WCAG AA.
**Valide: Exigences 19.3**

**Property 30: Validation de activityId**
*Pour tout* rendu du composant Chatbot, si la prop activityId est absente, vide, ou invalide, le composant doit afficher un message d'erreur au lieu de l'interface de chat.
**Valide: Exigences 20.3**

**Property 31: Types TypeScript stricts**
*Pour tout* composant, service, et interface, les types TypeScript doivent être explicitement définis sans utiliser 'any', et le mode strict doit être activé dans tsconfig.json.
**Valide: Exigences 20.4**

**Property 32: Gestion d'erreur avec try-catch**
*Pour toute* fonction asynchrone critique (sendMessage, API calls), le code doit inclure un bloc try-catch pour capturer et gérer les erreurs.
**Valide: Exigences 20.5**


## Gestion des Erreurs

### Erreurs Backend

#### Validation des Entrées

```typescript
// Erreur 400 - Bad Request
{
  statusCode: 400,
  message: ['message should not be empty', 'message must be a string'],
  error: 'Bad Request'
}
```

Cas déclencheurs:
- Champ message vide ou absent
- Champ activityId vide ou absent
- Types de données incorrects

#### Activité Non Trouvée

```typescript
// Erreur 404 - Not Found
{
  statusCode: 404,
  message: 'Activity with ID abc123 not found',
  error: 'Not Found'
}
```

Cas déclencheurs:
- activityId n'existe pas dans la base de données
- activityId mal formaté

#### Service Rasa Indisponible

```typescript
// Erreur 503 - Service Unavailable
{
  statusCode: 503,
  message: 'Chatbot service is temporarily unavailable. Please try again later.',
  error: 'Service Unavailable'
}
```

Cas déclencheurs:
- Rasa n'est pas démarré
- Erreur de connexion réseau à Rasa
- Timeout de connexion

#### Erreur Interne Rasa

```typescript
// Erreur 500 - Internal Server Error
{
  statusCode: 500,
  message: 'An error occurred while processing your message. Please try again.',
  error: 'Internal Server Error'
}
```

Cas déclencheurs:
- Rasa retourne une erreur 4xx ou 5xx
- Erreur lors du parsing de la réponse Rasa
- Exception non gérée dans le service

### Erreurs Frontend

#### Erreur Réseau

```typescript
// Message affiché dans le chat
{
  id: generateId(),
  text: "Désolé, je n'ai pas pu me connecter au serveur. Vérifiez votre connexion internet.",
  sender: 'bot',
  timestamp: new Date()
}
```

Cas déclencheurs:
- Pas de connexion internet
- Serveur backend inaccessible
- Timeout de requête

#### Erreur Backend (4xx/5xx)

```typescript
// Message affiché dans le chat
{
  id: generateId(),
  text: "Désolé, une erreur s'est produite. Veuillez réessayer dans quelques instants.",
  sender: 'bot',
  timestamp: new Date()
}
```

Cas déclencheurs:
- Backend retourne 400, 404, 500, 503
- Réponse backend mal formatée

#### Validation activityId

```typescript
// Affiché à la place du chatbot
<div className="chatbot-error">
  <p>Erreur: Aucune activité spécifiée</p>
  <p>Veuillez sélectionner une activité pour utiliser le chatbot.</p>
</div>
```

Cas déclencheurs:
- Prop activityId absente
- Prop activityId vide
- Prop activityId invalide

### Erreurs Rasa

#### Intent Non Reconnu

Rasa utilise le FallbackClassifier pour gérer les messages non compris.

```yaml
# domain.yml
responses:
  utter_default:
    - text: "Je ne suis pas sûr de comprendre. Vous pouvez me demander d'expliquer l'activité, pourquoi elle vous est recommandée, ou quelles compétences vous allez développer."
```

#### Données Contextuelles Manquantes

Rasa utilise des réponses alternatives basées sur la disponibilité des slots.

```yaml
# Exemple: score manquant
responses:
  utter_why_recommended:
    - condition:
        - type: slot
          name: score
          value: null
      text: "Cette activité vous est recommandée car elle correspond à vos objectifs professionnels : {objectif}."
    - text: "Cette activité vous est recommandée avec un score de {score}%. Elle correspond à vos objectifs professionnels : {objectif}."
```

### Stratégie de Logging

#### Niveaux de Log

- **ERROR**: Erreurs critiques nécessitant une attention immédiate
- **WARN**: Situations anormales mais gérées (activité non trouvée, Rasa indisponible)
- **INFO**: Événements normaux du système (requête reçue, réponse envoyée)
- **DEBUG**: Informations détaillées pour le débogage

#### Exemples de Logs

```typescript
// ERROR - Rasa indisponible
logger.error('Failed to connect to Rasa service', {
  url: 'http://localhost:5005/webhooks/rest/webhook',
  error: error.message,
  timestamp: new Date().toISOString()
});

// WARN - Activité non trouvée
logger.warn('Activity not found', {
  activityId: dto.activityId,
  timestamp: new Date().toISOString()
});

// INFO - Requête traitée avec succès
logger.info('Chat message processed successfully', {
  activityId: dto.activityId,
  messageLength: dto.message.length,
  responseLength: response.message.length,
  timestamp: new Date().toISOString()
});
```


## Stratégie de Test

### Approche Duale de Test

Ce projet utilise une approche combinant tests unitaires et tests basés sur les propriétés (property-based testing) pour assurer une couverture complète:

- **Tests unitaires**: Vérifient des exemples spécifiques, des cas limites et des conditions d'erreur
- **Tests basés sur propriétés**: Vérifient les propriétés universelles à travers de nombreuses entrées générées aléatoirement

Les deux approches sont complémentaires et nécessaires pour une couverture complète.

### Configuration des Tests Basés sur Propriétés

#### Bibliothèques Recommandées

- **Backend (NestJS/TypeScript)**: `fast-check`
- **Frontend (React/TypeScript)**: `fast-check` + `@testing-library/react`
- **Rasa**: Tests d'intégration avec `pytest` et `rasa test`

#### Configuration Minimale

Chaque test basé sur propriétés doit exécuter au minimum 100 itérations pour assurer une couverture suffisante grâce à la randomisation.

```typescript
// Exemple avec fast-check
import fc from 'fast-check';

it('Property 1: Validation des payloads valides', () => {
  fc.assert(
    fc.property(
      fc.record({
        message: fc.string({ minLength: 1 }),
        activityId: fc.string({ minLength: 1 })
      }),
      async (payload) => {
        const response = await request(app.getHttpServer())
          .post('/api/chat')
          .send(payload);
        
        expect(response.status).toBe(200);
      }
    ),
    { numRuns: 100 } // Minimum 100 itérations
  );
});
```

#### Tags de Référence

Chaque test basé sur propriétés doit inclure un commentaire référençant la propriété du document de conception:

```typescript
/**
 * Feature: hr-chatbot-rasa, Property 1: Validation des payloads valides
 * Pour tout payload JSON contenant des champs message (string non-vide) et 
 * activityId (string non-vide), l'endpoint POST /api/chat doit accepter 
 * la requête et retourner un code 200.
 */
it('Property 1: Validation des payloads valides', () => {
  // Test implementation
});
```

### Tests Backend (NestJS)

#### Tests Unitaires

Focus sur des exemples spécifiques et des cas limites:

```typescript
describe('ChatController', () => {
  it('should return 400 when message is empty', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ message: '', activityId: 'abc123' });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('message should not be empty');
  });

  it('should return 404 when activity does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ message: 'Hello', activityId: 'nonexistent' });
    
    expect(response.status).toBe(404);
  });

  it('should return 503 when Rasa is unavailable', async () => {
    // Mock Rasa service to throw connection error
    jest.spyOn(httpService, 'post').mockRejectedValue(new Error('ECONNREFUSED'));
    
    const response = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ message: 'Hello', activityId: 'abc123' });
    
    expect(response.status).toBe(503);
  });
});
```

#### Tests Basés sur Propriétés

Vérifient les propriétés universelles:

```typescript
/**
 * Feature: hr-chatbot-rasa, Property 3: Récupération des données d'activité
 */
it('Property 3: should retrieve activity data for any valid activityId', () => {
  fc.assert(
    fc.property(
      fc.uuid(), // Generate random valid UUIDs
      async (activityId) => {
        // Assume activity exists in test database
        const activity = await chatService.getActivityData(activityId);
        
        expect(activity).toBeDefined();
        expect(activity.title).toBeDefined();
        expect(activity.description).toBeDefined();
        expect(activity.requiredSkills).toBeInstanceOf(Array);
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Feature: hr-chatbot-rasa, Property 4: Enrichissement du contexte
 */
it('Property 4: should enrich context with default values for missing fields', () => {
  fc.assert(
    fc.property(
      fc.record({
        title: fc.string(),
        description: fc.option(fc.string(), { nil: null }),
        requiredSkills: fc.option(fc.array(fc.string()), { nil: null }),
        recommendationScore: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
        objective: fc.option(fc.string(), { nil: null })
      }),
      (activity) => {
        const context = chatService.enrichContext(activity);
        
        expect(context.titre).toBeDefined();
        expect(context.description).toBeDefined();
        expect(context.competences).toBeInstanceOf(Array);
        expect(context.objectif).toBeDefined();
        // Score can be undefined
      }
    ),
    { numRuns: 100 }
  );
});
```

### Tests Frontend (React)

#### Tests Unitaires

Focus sur des interactions spécifiques:

```typescript
describe('Chatbot Component', () => {
  it('should render input field and send button', () => {
    render(<Chatbot activityId="abc123" />);
    
    expect(screen.getByPlaceholderText(/tapez votre message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeInTheDocument();
  });

  it('should display error when activityId is missing', () => {
    render(<Chatbot activityId="" />);
    
    expect(screen.getByText(/aucune activité spécifiée/i)).toBeInTheDocument();
  });

  it('should display quick suggestion buttons', () => {
    render(<Chatbot activityId="abc123" />);
    
    expect(screen.getByText(/pourquoi recommandé/i)).toBeInTheDocument();
    expect(screen.getByText(/quelles compétences/i)).toBeInTheDocument();
    expect(screen.getByText(/explique cette activité/i)).toBeInTheDocument();
  });
});
```

#### Tests Basés sur Propriétés

Vérifient les comportements universels:

```typescript
/**
 * Feature: hr-chatbot-rasa, Property 15: Alignement des messages
 */
it('Property 15: should align user messages right and bot messages left', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          text: fc.string(),
          sender: fc.constantFrom('user', 'bot')
        })
      ),
      (messages) => {
        const { container } = render(
          <Chatbot activityId="abc123" initialMessages={messages} />
        );
        
        messages.forEach((msg, index) => {
          const messageElement = container.querySelectorAll('.message')[index];
          if (msg.sender === 'user') {
            expect(messageElement).toHaveClass('message-user');
            expect(messageElement).toHaveStyle({ textAlign: 'right' });
          } else {
            expect(messageElement).toHaveClass('message-bot');
            expect(messageElement).toHaveStyle({ textAlign: 'left' });
          }
        });
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Feature: hr-chatbot-rasa, Property 26: Ajout immédiat des messages utilisateur
 */
it('Property 26: should add user message immediately to UI', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      async (messageText) => {
        const { getByPlaceholderText, getByRole, findByText } = render(
          <Chatbot activityId="abc123" />
        );
        
        const input = getByPlaceholderText(/tapez votre message/i);
        const sendButton = getByRole('button', { name: /envoyer/i });
        
        fireEvent.change(input, { target: { value: messageText } });
        fireEvent.click(sendButton);
        
        // Message should appear immediately
        const userMessage = await findByText(messageText);
        expect(userMessage).toBeInTheDocument();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Tests Rasa

#### Tests de Configuration

Vérifier que les fichiers de configuration sont valides:

```bash
# Valider la configuration
rasa data validate

# Tester les stories
rasa test
```

#### Tests d'Intégration

Tester les intents avec des exemples:

```python
# tests/test_intents.py
import pytest
from rasa.core.agent import Agent

@pytest.fixture
async def agent():
    return await Agent.load("models/")

@pytest.mark.asyncio
async def test_explain_activity_intent(agent):
    """Test that explain_activity intent is recognized"""
    messages = [
        "Explique cette activité",
        "C'est quoi cette activité ?",
        "Peux-tu me décrire cette activité ?"
    ]
    
    for message in messages:
        result = await agent.parse_message(message)
        assert result['intent']['name'] == 'explain_activity'
        assert result['intent']['confidence'] > 0.7

@pytest.mark.asyncio
async def test_why_recommended_intent(agent):
    """Test that why_recommended intent is recognized"""
    messages = [
        "Pourquoi je suis recommandé ?",
        "Pourquoi cette activité ?",
        "Pourquoi me suggères-tu ça ?"
    ]
    
    for message in messages:
        result = await agent.parse_message(message)
        assert result['intent']['name'] == 'why_recommended'
        assert result['intent']['confidence'] > 0.7
```

### Tests d'Intégration End-to-End

Tester le flux complet React → NestJS → Rasa:

```typescript
describe('E2E: Chatbot Flow', () => {
  it('should complete full conversation flow', async () => {
    // 1. Start Rasa server
    // 2. Start NestJS backend
    // 3. Render React component
    
    const { getByPlaceholderText, getByRole, findByText } = render(
      <Chatbot activityId="test-activity-123" />
    );
    
    // User sends message
    const input = getByPlaceholderText(/tapez votre message/i);
    const sendButton = getByRole('button', { name: /envoyer/i });
    
    fireEvent.change(input, { target: { value: 'Explique cette activité' } });
    fireEvent.click(sendButton);
    
    // Wait for bot response
    const botResponse = await findByText(/cette activité s'intitule/i, {}, { timeout: 5000 });
    expect(botResponse).toBeInTheDocument();
  });
});
```

### Couverture de Code

Objectifs de couverture:

- **Backend**: Minimum 80% de couverture des lignes
- **Frontend**: Minimum 75% de couverture des composants
- **Rasa**: 100% des intents testés avec au moins 3 exemples chacun

### Exécution des Tests

```bash
# Backend
npm run test                    # Tests unitaires
npm run test:e2e               # Tests d'intégration
npm run test:cov               # Avec couverture

# Frontend
npm run test                    # Tests unitaires
npm run test:coverage          # Avec couverture

# Rasa
rasa test                       # Tests NLU et stories
rasa test nlu                   # Tests NLU uniquement
rasa test core                  # Tests stories uniquement
```

