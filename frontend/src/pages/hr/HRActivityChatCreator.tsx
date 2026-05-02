import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../../hooks/use-toast';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Users,
  Target,
  Calendar,
  MapPin,
  FileText,
  Wand2,
  ArrowLeft
} from 'lucide-react';
import {
  type ActivityData,
  type ManagerMessage,
  parseActivityFromText,
  parseFieldCompletion,
  generateRecommendations,
  generateManagerMessage,
} from './activityChatParse';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Types
type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  activityData?: Partial<ActivityData>;
  missingFields?: string[];
  recommendations?: string[];
  managerMessage?: ManagerMessage;
}

export default function HRActivityChatCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { departments, addActivity, fetchWithAuth } = useData();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Bonjour ${user?.name || ''} ! 👋\n\nJe suis votre assistant RH intelligent. Décrivez-moi l'activité que vous souhaitez créer en langage naturel, par exemple :\n\n• "Créer une formation React pour 10 développeurs juniors"\n• "Organiser un team building pour 25 personnes au parc"\n• "Mission certification AWS pour 5 ingénieurs seniors, urgent"\n\nJe vais extraire automatiquement les informations et remplir le formulaire pour vous !`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Partial<ActivityData> | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const buildExampleActivity = useCallback((): ActivityData => {
    const now = new Date();
    const start = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(17, 0, 0, 0);

    return {
      title: 'Formation React & TypeScript avancée',
      description:
        'Session pratique pour renforcer la qualité du code front-end, la performance et les bonnes pratiques de développement React/TypeScript.',
      type: 'training',
      location: 'Salle Innovation - Siège Tunis',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      maxParticipants: 12,
      departmentId: departments[0]?.id || '',
      requiredSkills: [
        { skill_name: 'React', desired_level: 'high' },
        { skill_name: 'TypeScript', desired_level: 'high' },
        { skill_name: 'Communication', desired_level: 'medium' },
      ],
      objectives: [
        'Mettre en place une architecture front-end maintenable',
        'Ameliorer la qualite des composants et la gestion d etat',
        'Uniformiser les pratiques de revue de code dans l equipe',
      ],
      experienceLevel: 'mid',
      priority: 'medium',
    };
  }, [departments]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const handleExtractActivity = async (text: string) => {
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const parsed = parseActivityFromText(text);
    setCurrentActivity(parsed.activity);
    setMissingFields(parsed.missingFields);
    
    const recommendations = generateRecommendations(parsed.activity);
    
    let responseText = '';
    
    if (parsed.confidence >= 0.7) {
      responseText = `✅ J'ai bien compris votre demande !\n\n**Activité détectée :**\n`;
    } else if (parsed.confidence >= 0.4) {
      responseText = `⚠️ J'ai partiellement compris. Voici ce que j'ai extrait :\n\n`;
    } else {
      responseText = `❓ Je n'ai pas bien compris. Pouvez-vous préciser ?\n\n`;
    }
    
    if (parsed.activity.title) responseText += `• **Titre** : ${parsed.activity.title}\n`;
    if (parsed.activity.type) responseText += `• **Type** : ${parsed.activity.type}\n`;
    if (parsed.activity.maxParticipants) responseText += `• **Participants** : ${parsed.activity.maxParticipants}\n`;
    if (parsed.activity.experienceLevel) responseText += `• **Niveau** : ${parsed.activity.experienceLevel}\n`;
    if (parsed.activity.priority) responseText += `• **Priorité** : ${parsed.activity.priority}\n`;
    if (parsed.activity.requiredSkills?.length) {
      responseText += `• **Compétences** : ${parsed.activity.requiredSkills.map(s => s.skill_name).join(', ')}\n`;
    }
    
    if (parsed.missingFields.length > 0) {
      const fieldLabels: Record<string, string> = {
        title: 'titre',
        description: 'description',
        type: "type d'activité",
        maxParticipants: 'nombre de participants',
        startDate: 'date de début',
        endDate: 'date de fin',
        departmentId: 'département',
        location: 'lieu',
        requiredSkills: 'compétences requises'
      };
      
      responseText += `\n❓ **Informations manquantes :**\n`;
      parsed.missingFields.forEach(field => {
        responseText += `• ${fieldLabels[field] || field}\n`;
      });
      responseText += `\n💬 Cliquez sur les boutons ci-dessus ou dites-moi par exemple : *"Ajoute la description : formation pratique sur React"*`;
    } else {
      responseText += `\n✨ Tous les champs sont remplis ! Vous pouvez :\n`;
      responseText += `• Dire **"envoyer au manager"** pour envoyer la demande\n`;
      responseText += `• Dire **"modifier le titre"** ou tout autre champ\n`;
      responseText += `• Dire **"recommande"** pour des suggestions`;
      setShowPreview(true);
    }
    
    addMessage({
      role: 'assistant',
      content: responseText,
      activityData: parsed.activity,
      missingFields: parsed.missingFields,
      recommendations
    });
    
    setIsProcessing(false);
  };

  const handleCompleteField = (field: string, value: string) => {
    if (!currentActivity) return;
    
    const updatedActivity = { ...currentActivity };
    
    switch (field) {
      case 'description':
        updatedActivity.description = value;
        break;
      case 'location':
        updatedActivity.location = value;
        break;
      case 'startDate':
        updatedActivity.startDate = value;
        break;
      case 'endDate':
        updatedActivity.endDate = value;
        break;
      case 'maxParticipants':
        updatedActivity.maxParticipants = parseInt(value) || 5;
        break;
      case 'title':
        updatedActivity.title = value;
        break;
    }
    
    setCurrentActivity(updatedActivity);
    
    const updatedMissing = missingFields.filter(f => f !== field);
    setMissingFields(updatedMissing);
    
    if (updatedMissing.length === 0) {
      setShowPreview(true);
    }
    
    addMessage({
      role: 'assistant',
      content: `✅ J'ai ajouté l'information : **${field}** = "${value}"\n\n${updatedMissing.length > 0 ? `Il reste ${updatedMissing.length} champ(s) à compléter.` : 'Parfait ! Tous les champs sont remplis. Vous pouvez maintenant envoyer au manager ou demander des recommandations.'}`
    });
    
    setEditField(null);
    setEditValue('');
  };

  const handleRecommend = () => {
    if (!currentActivity) return;
    
    const recommendations = generateRecommendations(currentActivity);
    
    let response = `💡 **Recommandations pour votre activité :**\n\n`;
    recommendations.forEach((rec, idx) => {
      response += `${idx + 1}. ${rec}\n`;
    });
    
    response += `\n🎯 **Suggestions de compétences à ajouter :**\n`;
    if (currentActivity.type === 'training') {
      response += `• Pédagogie\n• Évaluation des acquis\n• Support de cours\n`;
    } else if (currentActivity.type === 'project') {
      response += `• Gestion de projet\n• Collaboration\n• Livrables\n`;
    }
    
    addMessage({
      role: 'assistant',
      content: response,
      recommendations
    });
  };

  const handleSendToManager = async () => {
    if (!currentActivity || missingFields.length > 0) {
      addMessage({
        role: 'assistant',
        content: `❌ Impossible d'envoyer : il manque des informations obligatoires (${missingFields.join(', ')}). Complétez-les d'abord !`
      });
      return;
    }
    
    const completeActivity: ActivityData = {
      title: currentActivity.title || 'Activité sans titre',
      description: currentActivity.description || 'Description à compléter',
      type: currentActivity.type || 'training',
      location: currentActivity.location || 'À définir',
      startDate: currentActivity.startDate || new Date().toISOString().split('T')[0] + 'T09:00',
      endDate: currentActivity.endDate || new Date().toISOString().split('T')[0] + 'T17:00',
      maxParticipants: currentActivity.maxParticipants || 10,
      departmentId: currentActivity.departmentId || departments[0]?.id || '',
      requiredSkills: currentActivity.requiredSkills || [],
      objectives: currentActivity.objectives || ['Développer les compétences cibles'],
      experienceLevel: currentActivity.experienceLevel || 'mid',
      priority: currentActivity.priority || 'medium'
    };
    
    const managerMessage = generateManagerMessage(completeActivity);
    
    setIsProcessing(true);
    
    try {
      const payload = {
        title: completeActivity.title,
        description: completeActivity.description,
        type: completeActivity.type,
        maxParticipants: completeActivity.maxParticipants,
        departmentId: completeActivity.departmentId,
        startDate: new Date(completeActivity.startDate),
        endDate: new Date(completeActivity.endDate),
        location: { address: completeActivity.location, lat: 36.8065, lng: 10.1815 },
        requiredSkills: completeActivity.requiredSkills
      };
      
      const response = await fetchWithAuth(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création');
      }
      
      const created = await response.json();
      
      addActivity({
        id: created?._id ?? created?.id ?? crypto.randomUUID(),
        title: payload.title,
        description: payload.description,
        type: payload.type,
        required_skills: payload.requiredSkills.map(s => ({
          skill_name: s.skill_name,
          desired_level: s.desired_level ?? 'medium'
        })),
        seats: payload.maxParticipants,
        date: new Date(payload.startDate).toISOString(),
        duration: 'N/A',
        location: completeActivity.location,
        priority:
          completeActivity.priority === 'high'
            ? 'exploit_expert'
            : completeActivity.priority === 'medium'
              ? 'consolidate_medium'
              : 'develop_low',
        status: 'open',
        created_by: user?.name ?? 'HR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addMessage({
        role: 'assistant',
        content: `✅ **Activité créée et envoyée au manager !**\n\n📧 **Message envoyé :**\n**Objet :** ${managerMessage.subject}\n\n${managerMessage.content}\n\n🎯 **Récapitulatif :**\n• Activité ID: ${created?._id?.slice(-6) ?? 'N/A'}\n• Statut: En attente de validation\n• Manager notifié par email\n\nVous pouvez consulter l'activité dans la liste des activités.`,
        managerMessage
      });
      
      toast({
        title: 'Succès',
        description: 'Activité créée et envoyée au manager',
        variant: 'success'
      });
      
      setShowPreview(false);
      setCurrentActivity(null);
      setMissingFields([]);
      
    } catch (error: any) {
      addMessage({
        role: 'assistant',
        content: `❌ Erreur lors de l'envoi : ${error.message}. Veuillez réessayer.`
      });
      
      toast({
        title: 'Erreur',
        description: error.message || 'Création impossible',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue.trim();
    setInputValue('');
    
    addMessage({
      role: 'user',
      content: userText
    });
    
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes('recommande') || lowerText.includes('suggestion')) {
      handleRecommend();
      return;
    }
    
    if (lowerText.includes('envoyer au manager') || lowerText.includes('envoie au manager')) {
      await handleSendToManager();
      return;
    }

    if (
      lowerText.includes('exemple complet') ||
      lowerText.includes('activité exemple') ||
      lowerText.includes('activite exemple') ||
      lowerText.includes('tester exemple')
    ) {
      handleLoadCompleteExample();
      return;
    }
    
    // Détecter complétion de champ (parse borné, sans regex à backtracking catastrophique)
    const completion = parseFieldCompletion(userText);
    if (completion && currentActivity) {
      const fieldMap: Record<string, string> = {
        'description': 'description',
        'desc': 'description',
        'lieu': 'location',
        'location': 'location',
        'adresse': 'location',
        'date': 'startDate',
        'date de début': 'startDate',
        'date de fin': 'endDate',
        'participants': 'maxParticipants',
        'nombre': 'maxParticipants',
        'titre': 'title'
      };
      
      const fieldKey = completion.rawField.toLowerCase();
      const fieldValue = completion.value.trim();
      const mappedField = fieldMap[fieldKey];
      
      if (mappedField) {
        handleCompleteField(mappedField, fieldValue);
        return;
      }
    }
    
    await handleExtractActivity(userText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const fieldLabels: Record<string, string> = {
    title: 'Titre',
    description: 'Description',
    type: 'Type',
    maxParticipants: 'Participants',
    startDate: 'Date début',
    endDate: 'Date fin',
    departmentId: 'Département',
    location: 'Lieu',
    requiredSkills: 'Compétences'
  };

  const handleLoadCompleteExample = () => {
    const example = buildExampleActivity();
    const missing = example.departmentId ? [] : ['departmentId'];
    setCurrentActivity(example);
    setMissingFields(missing);
    setShowPreview(true);
    addMessage({
      role: 'assistant',
      content:
        missing.length === 0
          ? '✅ Exemple complet chargé. Vous pouvez tester directement avec "Envoyer au manager".'
          : '✅ Exemple chargé. Il manque uniquement le département: sélectionnez un département puis envoyez au manager.'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hr/activities')}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Assistant RH Intelligent</h1>
            <p className="text-xs text-muted-foreground">Création d'activité par conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              showPreview ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            {showPreview ? 'Masquer' : 'Voir'} le formulaire
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all ${showPreview ? 'w-1/2' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  
                  {message.missingFields && message.missingFields.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.missingFields.map(field => (
                        <button
                          key={field}
                          onClick={() => {
                            setEditField(field);
                            setEditValue('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-background border rounded-full hover:bg-primary/5 transition-colors"
                        >
                          + {fieldLabels[field] || field}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {message.managerMessage && (
                    <div className="mt-3 p-3 bg-background/50 rounded-lg border">
                      <p className="text-xs font-medium mb-1">📧 Message envoyé au manager</p>
                      <p className="text-xs text-muted-foreground truncate">{message.managerMessage.subject}</p>
                    </div>
                  )}
                  
                  <div className={`text-[10px] mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">L'assistant réfléchit...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-card">
            {editField ? (
              <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Compléter : {fieldLabels[editField]}</span>
                  <button 
                    onClick={() => { setEditField(null); setEditValue(''); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCompleteField(editField, editValue);
                      }
                    }}
                    placeholder={`Entrez ${fieldLabels[editField].toLowerCase()}...`}
                    className="flex-1 h-10 rounded-lg border px-3 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleCompleteField(editField, editValue)}
                    className="h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            ) : null}
            
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Décrivez votre activité... (ex: Créer une formation React pour 10 développeurs)"
                className="flex-1 min-h-[44px] max-h-32 rounded-lg border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isProcessing}
                className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Wand2 className="h-3 w-3" />
              <span>Commandes: "envoyer au manager" | "recommande" | "modifier [champ]" | "exemple complet"</span>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 border-l bg-card overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Aperçu de l'activité
              </h2>
            </div>
            {!currentActivity ? (
              <div className="p-4">
                <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                  Aucun formulaire n'est rempli pour le moment.
                  <br />
                  Décrivez une activité dans le chat ou tapez <span className="font-medium text-foreground">"exemple complet"</span>.
                </div>
              </div>
            ) : (
            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Titre</label>
                <div className="mt-1 p-2 bg-background rounded border">
                  {currentActivity.title || <span className="text-muted-foreground italic">Non défini</span>}
                </div>
              </div>
              
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Type</label>
                <div className="mt-1 flex items-center gap-2 p-2 bg-background rounded border">
                  <Target className="h-4 w-4 text-primary" />
                  {currentActivity.type || <span className="text-muted-foreground italic">Non défini</span>}
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                <div className="mt-1 p-2 bg-background rounded border min-h-[60px]">
                  {currentActivity.description || <span className="text-muted-foreground italic">Non définie</span>}
                </div>
              </div>
              
              {/* Participants & Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Participants</label>
                  <div className="mt-1 flex items-center gap-2 p-2 bg-background rounded border">
                    <Users className="h-4 w-4 text-primary" />
                    {currentActivity.maxParticipants || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Niveau</label>
                  <div className="mt-1 p-2 bg-background rounded border">
                    {currentActivity.experienceLevel || '-'}
                  </div>
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Date début</label>
                  <div className="mt-1 flex items-center gap-2 p-2 bg-background rounded border">
                    <Calendar className="h-4 w-4 text-primary" />
                    {currentActivity.startDate ? new Date(currentActivity.startDate).toLocaleDateString('fr-FR') : '-'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Date fin</label>
                  <div className="mt-1 flex items-center gap-2 p-2 bg-background rounded border">
                    <Calendar className="h-4 w-4 text-primary" />
                    {currentActivity.endDate ? new Date(currentActivity.endDate).toLocaleDateString('fr-FR') : '-'}
                  </div>
                </div>
              </div>
              
              {/* Location */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Lieu</label>
                <div className="mt-1 flex items-center gap-2 p-2 bg-background rounded border">
                  <MapPin className="h-4 w-4 text-primary" />
                  {currentActivity.location || <span className="text-muted-foreground italic">Non défini</span>}
                </div>
              </div>
              
              {/* Skills */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Compétences</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {currentActivity.requiredSkills?.length ? (
                    currentActivity.requiredSkills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {skill.skill_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">Aucune compétence définie</span>
                  )}
                </div>
              </div>
              
              {/* Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complétude</span>
                  <span className={`text-sm ${missingFields.length === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {missingFields.length === 0 ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Complet
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {missingFields.length} champ(s) manquant(s)
                      </span>
                    )}
                  </span>
                </div>
                
                {missingFields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {missingFields.map(field => (
                      <span key={field} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                        {fieldLabels[field] || field}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={handleSendToManager}
                  disabled={missingFields.length > 0 || isProcessing}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Envoyer au manager
                </button>
                
                <button
                  onClick={handleRecommend}
                  className="w-full py-2.5 border hover:bg-muted rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Obtenir des recommandations
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
