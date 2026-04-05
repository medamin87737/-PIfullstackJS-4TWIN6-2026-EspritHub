import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import { Recommendation, RecommendationDocument } from './schemas/recommendation.schema'
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema'
import { User, UserDocument } from '../users/schemas/user.schema'
import { Certificate, CertificateDocument } from './schemas/certificate.schema'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationType } from '../notifications/schemas/notification.schema'

const ELIGIBLE_STATUSES = ['PENDING', 'HR_APPROVED', 'MANAGER_APPROVED', 'NOTIFIED', 'ACCEPTED', 'DECLINED']

@Injectable()
export class CertificateService {
  constructor(
    @InjectModel(Recommendation.name) private readonly recommendationModel: Model<RecommendationDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Certificate.name) private readonly certificateModel: Model<CertificateDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async generateForActivity(activityId: string, _hrUserId: string): Promise<{ count: number }> {
    const activity = await this.activityModel.findById(activityId).lean()
    if (!activity) throw new HttpException('Activité introuvable', HttpStatus.NOT_FOUND)

    // ── Vérification 1 : activité marquée comme terminée ─────────────────
    if (!(activity as any).completed) {
      throw new HttpException(
        'L\'activité doit être marquée comme terminée avant de générer les certificats.',
        HttpStatus.BAD_REQUEST,
      )
    }

    // ── Vérification 2 : au moins un employé présent ─────────────────────
    const presentCount = await this.recommendationModel.countDocuments({
      activityId: new Types.ObjectId(activityId),
      presence: true,
    })
    if (presentCount === 0) {
      throw new HttpException(
        'Aucun employé marqué comme présent. Cochez la présence avant de générer les certificats.',
        HttpStatus.BAD_REQUEST,
      )
    }

    // Récupérer uniquement les employés présents
    const recommendations = await this.recommendationModel
      .find({
        activityId: new Types.ObjectId(activityId),
        status: { $in: ELIGIBLE_STATUSES },
        presence: true,
      })
      .sort({ rank: 1 })
      .lean()

    if (recommendations.length === 0) {
      throw new HttpException(
        'Aucune recommandation trouvée pour cette activité. Lancez d\'abord l\'analyse IA.',
        HttpStatus.BAD_REQUEST,
      )
    }

    const issueDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    let count = 0

    for (const rec of recommendations) {
      const employee = await this.userModel.findById(rec.userId).lean()
      if (!employee) continue

      const rank = rec.rank ?? count + 1
      const pdfData = await this._buildCertificatePdf(employee.name, activity.title, activity.type ?? 'formation', issueDate, rank)

      // Upsert : un seul certificat par (user, activity)
      const cert = await this.certificateModel.findOneAndUpdate(
        { userId: new Types.ObjectId(String(rec.userId)), activityId: new Types.ObjectId(activityId) },
        { userId: new Types.ObjectId(String(rec.userId)), activityId: new Types.ObjectId(activityId), activityTitle: activity.title, employeeName: employee.name, rank, issueDate, pdfData },
        { upsert: true, new: true },
      )

      await this.notificationsService.create({
        userId: String(rec.userId),
        type: NotificationType.CERTIFICATE_ISSUED,
        title: '🎓 Certificat de participation',
        message: `Félicitations ! Votre certificat pour "${activity.title}" est disponible.`,
        data: {
          activityId,
          activityTitle: activity.title,
          certificateId: String(cert._id),
          rank,
          issueDate,
        },
      })

      count++
    }

    return { count }
  }

  async markActivityCompleted(activityId: string): Promise<{ completed: boolean }> {
    const activity = await this.activityModel.findById(activityId)
    if (!activity) throw new HttpException('Activité introuvable', HttpStatus.NOT_FOUND)
    ;(activity as any).completed = !(activity as any).completed
    await activity.save()
    return { completed: (activity as any).completed }
  }

  async setPresence(recommendationId: string, presence: boolean): Promise<{ presence: boolean }> {
    const rec = await this.recommendationModel.findById(recommendationId)
    if (!rec) throw new HttpException('Recommandation introuvable', HttpStatus.NOT_FOUND)
    rec.presence = presence
    await rec.save()
    return { presence: rec.presence }
  }

  async getMyCertificates(userId: string): Promise<Omit<Certificate, 'pdfData'>[]> {
    const certs = await this.certificateModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('-pdfData') // ne pas retourner le PDF dans la liste
      .sort({ created_at: -1 })
      .lean()
    return certs as any
  }

  async downloadCertificate(certificateId: string, requesterId: string): Promise<{ pdfData: string; filename: string }> {
    // Cherche par ID uniquement — l'employé voit son certificat, HR/Manager peuvent aussi y accéder
    const cert = await this.certificateModel.findById(new Types.ObjectId(certificateId)).lean()

    if (!cert) throw new HttpException('Certificat introuvable', HttpStatus.NOT_FOUND)

    const safeName = cert.activityTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    return { pdfData: cert.pdfData, filename: `certificat_${safeName}.pdf` }
  }

  private async _buildCertificatePdf(
    employeeName: string,
    activityTitle: string,
    activityType: string,
    issueDate: string,
    rank: number,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([841.89, 595.28]) // A4 landscape
    const { width: W, height: H } = page.getSize()

    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // ── Couleurs Maghrebia ────────────────────────────────────────────────
    const navyDark  = rgb(0.059, 0.122, 0.239)   // sidebar bg  #0F1F3D
    const navy      = rgb(0.118, 0.227, 0.431)   // secondary   #1E3A6E
    const orange    = rgb(0.976, 0.451, 0.086)   // primary     #F97316
    const orangeLight = rgb(1.0,  0.82,  0.65)   // accent clair
    const white     = rgb(1, 1, 1)
    const offWhite  = rgb(0.94, 0.96, 0.99)
    const slate     = rgb(0.65, 0.73, 0.84)
    const cx = W / 2

    // ── Fond principal navy foncé ─────────────────────────────────────────
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: navyDark })

    // ── Bande décorative orange en haut ───────────────────────────────────
    page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: orange })

    // ── Bande décorative orange en bas ────────────────────────────────────
    page.drawRectangle({ x: 0, y: 0, width: W, height: 8, color: orange })

    // ── Cadre intérieur navy ──────────────────────────────────────────────
    const m = 22
    page.drawRectangle({
      x: m, y: m + 8, width: W - m * 2, height: H - m * 2 - 8,
      color: navy,
      borderColor: orange, borderWidth: 1.5,
    })

    // ── Ligne fine intérieure ─────────────────────────────────────────────
    const m2 = m + 10
    page.drawRectangle({
      x: m2, y: m2 + 8, width: W - m2 * 2, height: H - m2 * 2 - 8,
      color: navy,
      borderColor: rgb(1, 0.6, 0.2), borderWidth: 0.4,
    })

    // ── Accent coin haut gauche / bas droit ───────────────────────────────
    const cornerSize = 28
    // haut gauche
    page.drawLine({ start: { x: m, y: H - m - 8 }, end: { x: m + cornerSize, y: H - m - 8 }, thickness: 2.5, color: orange })
    page.drawLine({ start: { x: m, y: H - m - 8 }, end: { x: m, y: H - m - 8 - cornerSize }, thickness: 2.5, color: orange })
    // haut droit
    page.drawLine({ start: { x: W - m, y: H - m - 8 }, end: { x: W - m - cornerSize, y: H - m - 8 }, thickness: 2.5, color: orange })
    page.drawLine({ start: { x: W - m, y: H - m - 8 }, end: { x: W - m, y: H - m - 8 - cornerSize }, thickness: 2.5, color: orange })
    // bas gauche
    page.drawLine({ start: { x: m, y: m + 8 }, end: { x: m + cornerSize, y: m + 8 }, thickness: 2.5, color: orange })
    page.drawLine({ start: { x: m, y: m + 8 }, end: { x: m, y: m + 8 + cornerSize }, thickness: 2.5, color: orange })
    // bas droit
    page.drawLine({ start: { x: W - m, y: m + 8 }, end: { x: W - m - cornerSize, y: m + 8 }, thickness: 2.5, color: orange })
    page.drawLine({ start: { x: W - m, y: m + 8 }, end: { x: W - m, y: m + 8 + cornerSize }, thickness: 2.5, color: orange })

    const draw = (text: string, y: number, size: number, font: typeof fontBold, color: typeof orange) => {
      const w = font.widthOfTextAtSize(text, size)
      page.drawText(text, { x: cx - w / 2, y, size, font, color })
    }

    // ── Logo Maghrebia (icône éclair + texte) ─────────────────────────────
    // Cercle orange pour l'icône
    page.drawEllipse({ x: cx - 68, y: H - 62, xScale: 14, yScale: 14, color: orange })
    // Éclair simplifié (trait blanc)
    page.drawLine({ start: { x: cx - 71, y: H - 54 }, end: { x: cx - 67, y: H - 62 }, thickness: 2, color: white })
    page.drawLine({ start: { x: cx - 67, y: H - 62 }, end: { x: cx - 63, y: H - 62 }, thickness: 2, color: white })
    page.drawLine({ start: { x: cx - 63, y: H - 62 }, end: { x: cx - 68, y: H - 72 }, thickness: 2, color: white })

    // Nom Maghrebia
    const maghrebiaSize = 22
    const maghrebiaW = fontBold.widthOfTextAtSize('Maghrebia', maghrebiaSize)
    page.drawText('Maghrebia', { x: cx - 50, y: H - 68, size: maghrebiaSize, font: fontBold, color: orange })
    // Sous-titre plateforme
    const subPlatW = fontRegular.widthOfTextAtSize('SkillUp Platform', 9)
    page.drawText('SkillUp Platform', { x: cx - 50, y: H - 80, size: 9, font: fontRegular, color: slate })

    // Ligne séparatrice orange sous le logo
    page.drawLine({ start: { x: 80, y: H - 90 }, end: { x: W - 80, y: H - 90 }, thickness: 0.8, color: orange })

    // ── Titre CERTIFICAT ──────────────────────────────────────────────────
    draw('CERTIFICAT DE PARTICIPATION', H - 120, 26, fontBold, white)

    // Ligne décorative sous le titre
    const titleW = fontBold.widthOfTextAtSize('CERTIFICAT DE PARTICIPATION', 26)
    page.drawLine({ start: { x: cx - titleW / 2, y: H - 126 }, end: { x: cx + titleW / 2, y: H - 126 }, thickness: 0.6, color: orange })

    // ── "décerné à" ───────────────────────────────────────────────────────
    draw('Ce certificat est décerné à', H - 158, 11, fontOblique, slate)

    // ── Nom employé ───────────────────────────────────────────────────────
    draw(employeeName, H - 192, 28, fontBold, orange)
    const nameW = fontBold.widthOfTextAtSize(employeeName, 28)
    page.drawLine({ start: { x: cx - nameW / 2, y: H - 198 }, end: { x: cx + nameW / 2, y: H - 198 }, thickness: 0.5, color: orange })

    // ── Description ───────────────────────────────────────────────────────
    draw("pour sa participation et son engagement dans l'activité de formation", H - 228, 10.5, fontRegular, offWhite)

    // ── Titre activité ────────────────────────────────────────────────────
    const actText = `"${activityTitle}"`
    const actSize = 15
    const actW = fontBold.widthOfTextAtSize(actText, actSize)
    page.drawText(actText, { x: cx - actW / 2, y: H - 256, size: actSize, font: fontBold, color: orange })

    // ── Type + Rang ───────────────────────────────────────────────────────
    draw(`Type : ${activityType}   ·   Classement : #${rank}`, H - 278, 9.5, fontRegular, slate)

    // ── Séparateur central ────────────────────────────────────────────────
    page.drawLine({ start: { x: 100, y: H - 300 }, end: { x: W - 100, y: H - 300 }, thickness: 0.4, color: rgb(0.3, 0.4, 0.6) })

    // ── Date ──────────────────────────────────────────────────────────────
    draw(`Délivré le ${issueDate}`, H - 322, 9.5, fontRegular, slate)

    // ── Zone signature standard typographique ─────────────────────────────
    const sigY = H - 340

    // ── Signature gauche — DRH ────────────────────────────────────────────
    const sigLX = 100

    // Signature cursive simulée (oblique gras)
    page.drawText('Responsable RH', { x: sigLX, y: sigY, size: 13, font: fontOblique, color: white })
    // Ligne de séparation
    page.drawLine({ start: { x: sigLX, y: sigY - 8 }, end: { x: sigLX + 140, y: sigY - 8 }, thickness: 0.6, color: orange })
    // Titre
    page.drawText('Directeur des Ressources Humaines', { x: sigLX, y: sigY - 20, size: 8, font: fontBold, color: offWhite })
    page.drawText('Maghrebia Assurances', { x: sigLX, y: sigY - 31, size: 7.5, font: fontOblique, color: slate })

    // ── Signature droite — DG ─────────────────────────────────────────────
    const sigRX = W - 240

    page.drawText('Directeur Général', { x: sigRX, y: sigY, size: 13, font: fontOblique, color: white })
    page.drawLine({ start: { x: sigRX, y: sigY - 8 }, end: { x: sigRX + 140, y: sigY - 8 }, thickness: 0.6, color: orange })
    page.drawText('Directeur Général', { x: sigRX, y: sigY - 20, size: 8, font: fontBold, color: offWhite })
    page.drawText('Maghrebia Assurances', { x: sigRX, y: sigY - 31, size: 7.5, font: fontOblique, color: slate })

    // ── Sceau central officiel ────────────────────────────────────────────
    const sealY = sigY - 14
    // Cercle extérieur
    page.drawEllipse({ x: cx, y: sealY, xScale: 28, yScale: 28, borderColor: orange, borderWidth: 1.5, color: navyDark })
    // Cercle intérieur
    page.drawEllipse({ x: cx, y: sealY, xScale: 21, yScale: 21, borderColor: rgb(1, 0.6, 0.2), borderWidth: 0.6, color: navyDark })
    // Lettre M
    const sealText = 'M'
    const sealW = fontBold.widthOfTextAtSize(sealText, 18)
    page.drawText(sealText, { x: cx - sealW / 2, y: sealY - 8, size: 18, font: fontBold, color: orange })
    // Texte circulaire simulé (ligne de points)
    page.drawText('· MAGHREBIA ASSURANCES ·', {
      x: cx - fontRegular.widthOfTextAtSize('· MAGHREBIA ASSURANCES ·', 5.5) / 2,
      y: sealY + 16,
      size: 5.5, font: fontRegular, color: rgb(0.7, 0.75, 0.85),
    })

    // ── Numéro de certificat ──────────────────────────────────────────────
    const certNum = `N° CERT-${Date.now().toString(36).toUpperCase().slice(-8)}`
    const certNumW = fontRegular.widthOfTextAtSize(certNum, 7)
    page.drawText(certNum, { x: cx - certNumW / 2, y: m + 18, size: 7, font: fontRegular, color: rgb(0.4, 0.5, 0.65) })

    const pdfBytes = await pdfDoc.save()
    return `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`
  }
}
