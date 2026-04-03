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

  async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
    try {
      // 1. Récupérer les données de l'activité
      const activity = await this.getActivityData(dto.activityId);
      
      this.logger.log(`Activity retrieved: ${JSON.stringify(activity)}`);

      // 2. Enrichir le contexte
      const enrichedContext = this.enrichContext(activity);
      
      this.logger.log(`Enriched context: ${JSON.stringify(enrichedContext)}`);

      // 3. Envoyer à Rasa
      const rasaResponse = await this.sendToRasa(dto.message, enrichedContext);

      // 4. Retourner la réponse
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
