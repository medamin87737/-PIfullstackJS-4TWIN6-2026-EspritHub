export interface RasaContext {
  titre: string;
  description: string;
  competences: string[];
  score?: number;
  objectif?: string;
  duration?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
}

export interface RasaWebhookRequest {
  sender: string;
  message: string;
  metadata?: {
    activity: RasaContext;
    slots?: Record<string, string | null>;
  };
}

export interface RasaWebhookResponse {
  recipient_id: string;
  text: string;
}
