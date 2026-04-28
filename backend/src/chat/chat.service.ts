import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ActivitiesService } from '../activities/activities.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { RewritePromptDto } from './dto/rewrite-prompt.dto';
import { WebsiteGuideDto } from './dto/website-guide.dto';
import {
  RasaContext,
  RasaWebhookRequest,
  RasaWebhookResponse,
} from './interfaces/rasa.interfaces';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly rasaWebhookUrl = 'http://localhost:5005/webhooks/rest/webhook';

  constructor(
    private readonly httpService: HttpService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async processMessage(dto: ChatMessageDto, userLanguage: string = 'fr'): Promise<ChatResponseDto> {
    try {
      // 1. Use message as-is (translation removed)
      const messageInFrench = dto.message;

      // 2. Récupérer les données de l'activité
      const activity = await this.getActivityData(dto.activityId);
      
      this.logger.log(`Activity retrieved: ${JSON.stringify(activity)}`);

      // 3. Enrichir le contexte
      const enrichedContext = this.enrichContext(activity);
      
      this.logger.log(`Enriched context: ${JSON.stringify(enrichedContext)}`);

      // 4. Envoyer à Rasa (en français)
      const rasaResponse = await this.sendToRasa(messageInFrench, enrichedContext);

      // 5. Retourner la réponse (translation removed)
      return {
        message: rasaResponse,
        timestamp: new Date(),
        success: true,
      };
    } catch (error) {
      this.logger.error('Error processing chat message', error);
      throw error;
    }
  }

  private async getActivityData(activityId: string) {
    try {
      const activity = await this.activitiesService.findOne(activityId);
      return activity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`Activity not found: ${activityId}`);
        throw new NotFoundException(
          `Activity with ID ${activityId} not found`,
        );
      }
      throw error;
    }
  }

  private enrichContext(activity: any): RasaContext {
    // Mapper les champs de l'activité vers RasaContext
    const competences = activity.requiredSkills && Array.isArray(activity.requiredSkills)
      ? activity.requiredSkills.map((skill: any) => skill.skill_name || 'compétence non spécifiée')
      : [];

    return {
      titre: activity.title || activity.titre || 'Activité sans titre',
      description: activity.description || 'Aucune description disponible',
      competences: competences.length > 0 ? competences : ['Aucune compétence spécifiée'],
      score: undefined, // Le score sera ajouté plus tard via le système de recommandation
      objectif: activity.objectifs || activity.description || 'votre développement professionnel',
      duration: activity.duration || 'non spécifiée',
      location: activity.location || 'À définir',
      start_date: activity.startDate || activity.date ? new Date(activity.startDate || activity.date).toLocaleDateString('fr-FR') : 'non définie',
      end_date: activity.endDate ? new Date(activity.endDate).toLocaleDateString('fr-FR') : 'non définie',
    };
  }

  async rewritePrompt(dto: RewritePromptDto): Promise<{ rewritten: string; model: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
    const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const strict = process.env.OPENROUTER_STRICT === 'true';

    const systemPrompt = dto.constraints ??
      'Reformule ce texte en message professionnel clair et poli. ' +
      'Corrige les fautes, améliore la formulation. ' +
      'Conserve le sens original. Réponds uniquement avec le texte reformulé, sans explication.';

    if (!apiKey) {
      if (strict) throw new ServiceUnavailableException('OpenRouter API key not configured');
      // Fallback: retourner le texte tel quel
      return { rewritten: dto.prompt, model: 'fallback' };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: dto.prompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:5173',
              'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'SkillUpTn',
            },
            timeout: Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20000),
          },
        ),
      );

      const rewritten = String(response.data?.choices?.[0]?.message?.content ?? '').trim();
      if (!rewritten) throw new InternalServerErrorException('Empty response from LLM');

      return { rewritten, model };
    } catch (error: any) {
      this.logger.error('OpenRouter rewrite error', error?.message);
      if (strict) throw new ServiceUnavailableException('Rewrite service unavailable');
      return { rewritten: dto.prompt, model: 'fallback' };
    }
  }

  async websiteGuide(dto: WebsiteGuideDto): Promise<{ reply: string; timestamp: Date }> {
    const role = (dto.userRole ?? 'EMPLOYEE').toUpperCase();
    const currentPath = dto.currentPath ?? '/';
    const language = dto.language || 'fr';
    const question = dto.message.trim();

    const systemPrompt =
      'Tu es AgentWebsite, un assistant qui explique comment utiliser ce site. ' +
      'Donne une reponse pratique, courte, actionnable, en etapes numerotees. ' +
      'Reponds dans la langue demandee (fr par defaut). ' +
      'N invente pas des pages qui n existent pas.';

    const roleMap = this.getRoleNavigationMap(role);
    const pageHint = this.getCurrentPageHint(currentPath);

    const userPrompt = [
      `Langue: ${language}`,
      `Role utilisateur: ${role}`,
      `Page actuelle: ${currentPath}`,
      `Pages disponibles pour ce role: ${roleMap.join(', ')}`,
      `Contexte de la page: ${pageHint}`,
      `Question utilisateur: ${question}`,
      'Donne aussi 2 prochaines actions concretes.',
      'Ajoute une section "Liens utiles" avec 2 a 4 routes internes exactes (ex: /hr/activities).',
    ].join('\n');

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
    const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      return {
        reply: this.buildWebsiteGuideFallback(question, role, currentPath),
        timestamp: new Date(),
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:5173',
              'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'SkillUpTn AgentWebsite',
            },
            timeout: Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20000),
          },
        ),
      );

      const reply = String(response.data?.choices?.[0]?.message?.content ?? '').trim();
      return {
        reply: reply || this.buildWebsiteGuideFallback(question, role, currentPath),
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.warn(`Website guide AI fallback used: ${error?.message ?? 'unknown error'}`);
      return {
        reply: this.buildWebsiteGuideFallback(question, role, currentPath),
        timestamp: new Date(),
      };
    }
  }

  private getRoleNavigationMap(role: string): string[] {
    const maps: Record<string, string[]> = {
      ADMIN: ['/admin/dashboard', '/admin/users', '/admin/departments', '/admin/skills', '/admin/questions', '/admin/analytics'],
      HR: ['/hr/dashboard', '/hr/activities', '/hr/reports', '/hr/create-activity', '/hr/import-employees', '/hr/activity-requests', '/hr/history', '/hr/analytics'],
      MANAGER: ['/manager/dashboard', '/manager/activities', '/manager/activity-requests', '/manager/validations', '/manager/history'],
      EMPLOYEE: ['/employee/dashboard', '/employee/activities', '/employee/notifications', '/employee/certificates', '/employee/skill-updates', '/employee/history', '/employee/profile'],
    };
    return maps[role] ?? maps.EMPLOYEE;
  }

  private getCurrentPageHint(path: string): string {
    if (path.includes('/dashboard')) return 'Vue generale et indicateurs principaux';
    if (path.includes('/activities')) return 'Gestion et suivi des activites';
    if (path.includes('/reports')) return 'Rapports et exports';
    if (path.includes('/notifications')) return 'Lecture des notifications et actions rapides';
    if (path.includes('/profile')) return 'Informations utilisateur et preferences';
    if (path.includes('/analytics')) return 'Graphiques et analyse de performance';
    if (path.includes('/history')) return 'Historique des actions et decisions';
    return 'Page applicative en cours';
  }

  private buildWebsiteGuideFallback(question: string, role: string, currentPath: string): string {
    const quickTips = this.getQuickTipsByRole(role);
    const pageHint = this.getCurrentPageHint(currentPath);
    const roleMap = this.getRoleNavigationMap(role).slice(0, 3);

    return [
      `Je suis AgentWebsite. Je vous aide a utiliser la page: ${currentPath}.`,
      `Contexte: ${pageHint}.`,
      '',
      'Etapes conseillees:',
      '1) Ouvrez la map de navigation sous le header pour voir votre position dans le site.',
      '2) Utilisez les liens rapides de votre role pour acceder directement aux pages principales.',
      `3) Pour votre question "${question}", commencez par cette action: ${quickTips[0]}.`,
      '',
      'Prochaines actions:',
      `- ${quickTips[1]}`,
      `- ${quickTips[2]}`,
      '',
      'Liens utiles:',
      ...roleMap.map((p) => `- ${p}`),
    ].join('\n');
  }

  private getQuickTipsByRole(role: string): [string, string, string] {
    switch (role) {
      case 'ADMIN':
        return [
          'allez dans Utilisateurs pour verifier les comptes et roles',
          'consultez Analytiques pour suivre les indicateurs globaux',
          'mettez a jour Competences/Questions pour garder le referentiel coherent',
        ];
      case 'HR':
        return [
          'allez dans Activites pour creer ou suivre une activite',
          'utilisez Rapports pour exporter les resultats et le suivi',
          'ouvrez Demandes managers pour valider les demandes d activites',
        ];
      case 'MANAGER':
        return [
          'ouvrez Activites pour suivre les collaborateurs',
          'allez dans Validations pour traiter les decisions en attente',
          'utilisez Demander activite pour proposer une nouvelle action',
        ];
      default:
        return [
          'ouvrez Mes activites pour voir vos affectations',
          'consultez Notifications pour traiter les actions importantes',
          'mettez a jour Mon profil et suivez Evolution competences',
        ];
    }
  }

  private async sendToRasa(
    message: string,
    context: RasaContext,
  ): Promise<string> {
    try {
      const payload: RasaWebhookRequest = {
        sender: 'user',
        message: message,
        metadata: {
          activity: context,
        },
      };

      this.logger.log(`Sending to Rasa: ${JSON.stringify(payload, null, 2)}`);

      const response = await firstValueFrom(
        this.httpService.post<RasaWebhookResponse[]>(
          this.rasaWebhookUrl,
          payload,
        ),
      );

      this.logger.log(`Rasa response: ${JSON.stringify(response.data, null, 2)}`);

      // Extraire le texte de la réponse
      if (response.data && response.data.length > 0) {
        const responseText = response.data.map((msg) => msg.text).join(' ');
        return responseText;
      }

      return 'Désolé, je n\'ai pas pu générer une réponse.';
    } catch (error: any) {
      // Gérer les erreurs de connexion
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        this.logger.error('Failed to connect to Rasa service', {
          url: this.rasaWebhookUrl,
          error: error.message,
        });
        throw new ServiceUnavailableException(
          'Chatbot service is temporarily unavailable. Please try again later.',
        );
      }

      // Gérer les erreurs HTTP 4xx/5xx
      if (error.response) {
        this.logger.error('Rasa service returned an error', {
          status: error.response.status,
          data: error.response.data,
        });
        throw new InternalServerErrorException(
          'An error occurred while processing your message. Please try again.',
        );
      }

      // Autres erreurs
      this.logger.error('Unexpected error communicating with Rasa', error);
      throw new InternalServerErrorException(
        'An error occurred while processing your message. Please try again.',
      );
    }
  }
}
