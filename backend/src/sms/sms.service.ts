import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as twilio from 'twilio'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)
  private readonly client: twilio.Twilio | null = null
  private readonly from: string

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.from = this.configService.get<string>('TWILIO_PHONE_NUMBER') ?? ''

    // Twilio valide que le SID commence par "AC" — on vérifie avant d'instancier
    const validSid = accountSid?.startsWith('AC') && accountSid.length > 10
    const validToken = !!authToken && authToken.length > 10
    const validFrom = !!this.from

    if (validSid && validToken && validFrom) {
      try {
        this.client = twilio.default(accountSid!, authToken!)
        this.logger.log('Twilio SMS service initialized')
      } catch (err: any) {
        this.logger.warn(`Twilio init failed — SMS disabled: ${String(err?.message ?? err)}`)
      }
    } else {
      this.logger.warn(
        'Twilio not configured or invalid credentials — SMS will be skipped. ' +
        'Set TWILIO_ACCOUNT_SID (starts with AC), TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in backend/.env',
      )
    }
  }

  /**
   * Envoie un SMS de rappel à un employé recommandé pour une activité.
   * Silencieux si Twilio n'est pas configuré.
   */
  async sendRecommendationReminder(opts: {
    to: string
    employeeName: string
    activityTitle: string
    activityDate: Date | string
    deadlineDays?: number
    frontendUrl?: string
  }): Promise<void> {
    if (!this.client) return

    const phone = this.normalizePhone(opts.to)
    if (!phone) {
      this.logger.warn(`SMS skipped — invalid phone number: "${opts.to}"`)
      return
    }

    const dateStr = new Date(opts.activityDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    const deadline = opts.deadlineDays ?? 3
    const url = opts.frontendUrl ?? process.env.FRONTEND_URL ?? 'http://localhost:5173'

    const body =
      `Bonjour ${opts.employeeName}, vous avez été sélectionné(e) pour l'activité ` +
      `"${opts.activityTitle}" prévue le ${dateStr}. ` +
      `Merci de consulter votre compte et d'accepter ou refuser avec justification ` +
      `dans les ${deadline} jours : ${url}/employee/activities`

    try {
      const msg = await this.client.messages.create({
        body,
        from: this.from,
        to: phone,
      })
      this.logger.log(`SMS sent to ${phone} — SID: ${msg.sid}`)
    } catch (err: any) {
      // Non-bloquant : on log l'erreur sans faire échouer la requête principale
      this.logger.error(`SMS failed to ${phone}: ${String(err?.message ?? err)}`)
    }
  }

  /** Normalise un numéro tunisien ou international au format E.164 */
  private normalizePhone(raw: string): string | null {
    if (!raw) return null
    // Supprimer espaces, tirets, parenthèses
    let cleaned = raw.replace(/[\s\-().]/g, '')
    // Numéro tunisien local (8 chiffres) → +216XXXXXXXX
    if (/^\d{8}$/.test(cleaned)) return `+216${cleaned}`
    // Déjà en E.164
    if (/^\+\d{7,15}$/.test(cleaned)) return cleaned
    // Préfixe 00 → +
    if (/^00\d{7,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`
    return null
  }
}
