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
import { TranslationService } from '../translation/translation.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { RewritePromptDto } from './dto/rewrite-prompt.dto';
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
    private readonly translationService: TranslationService,
  ) {}

  async processMessage(dto: ChatMessageDto, userLanguage: string = 'fr'): Promise<ChatResponseDto> {
    try {
      // 1. Translate user message to French if needed
      let messageInFrench = dto.message;
      if (userLanguage !== 'fr') {
        const translationResult = await this.translationService.translate(
          dto.message,
          'fr',
          userLanguage,
        );
        messageInFrench = translationResult.translatedText;
        this.logger.log(`Translated user message: ${userLanguage} -> fr: "${dto.message}" -> "${messageInFrench}"`);
      }

      // 2. Récupérer les données de l'activité
      const activity = await this.getActivityData(dto.activityId);
      
      this.logger.log(`Activity retrieved: ${JSON.stringify(activity)}`);

      // 3. Enrichir le contexte
      const enrichedContext = this.enrichContext(activity);
      
      this.logger.log(`Enriched context: ${JSON.stringify(enrichedContext)}`);

      // 4. Envoyer à Rasa (en français)
      const rasaResponse = await this.sendToRasa(messageInFrench, enrichedContext);

      // 5. Translate Rasa response back to user language if needed
      let finalResponse = rasaResponse;
      if (userLanguage !== 'fr') {
        const translationResult = await this.translationService.translate(
          rasaResponse,
          userLanguage,
          'fr',
        );
        finalResponse = translationResult.translatedText;
        this.logger.log(`Translated bot response: fr -> ${userLanguage}: "${rasaResponse}" -> "${finalResponse}"`);
      }

      // 6. Retourner la réponse
      return {
        message: finalResponse,
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
