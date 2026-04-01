import { Injectable } from '@nestjs/common'
import PptxGenJS from 'pptxgenjs'

const ORANGE = 'F97316'
const DARK_BLUE = '1E3A5F'
const LIGHT_GRAY = 'F3F4F6'
const WHITE = 'FFFFFF'
const TEXT_DARK = '1F2937'
const TEXT_MUTED = '6B7280'

const LEVEL_LABELS: Record<string, string> = {
  low: 'Débutant',
  medium: 'Intermédiaire',
  high: 'Avancé',
  expert: 'Expert',
}

export interface ActivityPptxData {
  id: string
  title: string
  description: string
  objectifs?: string
  type: string
  location?: string
  duration?: string
  startDate: Date | string
  endDate: Date | string
  maxParticipants: number
  status: string
  requiredSkills: { skill_name: string; desired_level: string }[]
  departmentId?: string
}

@Injectable()
export class PptxService {
  async generateActivityPresentation(activity: ActivityPptxData): Promise<Buffer> {
    const pptx = new PptxGenJS()

    pptx.layout = 'LAYOUT_WIDE'
    pptx.author = 'SkillUpTN'
    pptx.company = 'SkillUpTN RH'
    pptx.subject = `Activité: ${activity.title}`
    pptx.title = activity.title

    const fmt = (d: Date | string) =>
      new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const typeLabel: Record<string, string> = {
      training: 'Formation',
      certification: 'Certification',
      project: 'Projet',
      mission: 'Mission',
      audit: 'Audit',
    }

    // ── Slide 1 : Couverture ──────────────────────────────────────────────
    const s1 = pptx.addSlide()

    // Fond dégradé simulé avec deux rectangles
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK_BLUE } })
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: 3.5, w: '100%', h: 2.5, fill: { color: ORANGE } })

    // Badge type
    s1.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.4, w: 1.8, h: 0.45,
      fill: { color: ORANGE }, line: { color: ORANGE },
      rectRadius: 0.1,
    })
    s1.addText(typeLabel[activity.type] ?? activity.type, {
      x: 0.5, y: 0.4, w: 1.8, h: 0.45,
      fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle',
    })

    // Titre principal
    s1.addText(activity.title, {
      x: 0.5, y: 1.0, w: 12.3, h: 1.8,
      fontSize: 36, bold: true, color: WHITE,
      align: 'left', valign: 'middle',
      wrap: true,
    })

    // Sous-titre sur fond orange
    s1.addText(`${fmt(activity.startDate)} → ${fmt(activity.endDate)}`, {
      x: 0.5, y: 3.6, w: 8, h: 0.5,
      fontSize: 16, color: WHITE, bold: false, align: 'left',
    })
    s1.addText(`${activity.maxParticipants} participant(s) · ${activity.location ?? 'Lieu à définir'}`, {
      x: 0.5, y: 4.2, w: 8, h: 0.45,
      fontSize: 14, color: WHITE, align: 'left',
    })

    // Logo texte
    s1.addText('SkillUpTN', {
      x: 10.5, y: 5.3, w: 2.5, h: 0.5,
      fontSize: 13, bold: true, color: WHITE, align: 'right',
    })

    // ── Slide 2 : Description & Objectifs ────────────────────────────────
    const s2 = pptx.addSlide()
    s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: DARK_BLUE } })
    s2.addText('Description & Objectifs', {
      x: 0.4, y: 0, w: 12, h: 0.8,
      fontSize: 20, bold: true, color: WHITE, valign: 'middle',
    })

    s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.0, w: 0.08, h: 1.2, fill: { color: ORANGE } })
    s2.addText('Description', {
      x: 0.7, y: 1.0, w: 3, h: 0.4,
      fontSize: 13, bold: true, color: DARK_BLUE,
    })
    s2.addText(activity.description || 'Aucune description fournie.', {
      x: 0.7, y: 1.4, w: 12, h: 1.0,
      fontSize: 12, color: TEXT_DARK, wrap: true,
    })

    if (activity.objectifs) {
      s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.7, w: 0.08, h: 1.2, fill: { color: ORANGE } })
      s2.addText('Objectifs', {
        x: 0.7, y: 2.7, w: 3, h: 0.4,
        fontSize: 13, bold: true, color: DARK_BLUE,
      })
      s2.addText(activity.objectifs, {
        x: 0.7, y: 3.1, w: 12, h: 1.5,
        fontSize: 12, color: TEXT_DARK, wrap: true,
      })
    }

    // ── Slide 3 : Informations pratiques ─────────────────────────────────
    const s3 = pptx.addSlide()
    s3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: DARK_BLUE } })
    s3.addText('Informations pratiques', {
      x: 0.4, y: 0, w: 12, h: 0.8,
      fontSize: 20, bold: true, color: WHITE, valign: 'middle',
    })

    const infoRows = [
      ['📅 Date de début', fmt(activity.startDate)],
      ['📅 Date de fin', fmt(activity.endDate)],
      ['📍 Lieu', activity.location ?? 'À définir'],
      ['⏱ Durée', activity.duration ?? 'Non précisée'],
      ['👥 Participants max', String(activity.maxParticipants)],
      ['📋 Type', typeLabel[activity.type] ?? activity.type],
      ['🔖 Statut', activity.status],
    ]

    infoRows.forEach(([label, value], i) => {
      const y = 1.1 + i * 0.62
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE
      s3.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12.5, h: 0.55, fill: { color: bg } })
      s3.addText(label, { x: 0.6, y, w: 4, h: 0.55, fontSize: 12, bold: true, color: DARK_BLUE, valign: 'middle' })
      s3.addText(value, { x: 4.8, y, w: 8, h: 0.55, fontSize: 12, color: TEXT_DARK, valign: 'middle' })
    })

    // ── Slide 4 : Compétences requises ───────────────────────────────────
    if (activity.requiredSkills?.length > 0) {
      const s4 = pptx.addSlide()
      s4.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: DARK_BLUE } })
      s4.addText('Compétences requises', {
        x: 0.4, y: 0, w: 12, h: 0.8,
        fontSize: 20, bold: true, color: WHITE, valign: 'middle',
      })

      // En-tête tableau
      s4.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.0, w: 12.5, h: 0.5, fill: { color: ORANGE } })
      s4.addText('Compétence', { x: 0.6, y: 1.0, w: 8, h: 0.5, fontSize: 12, bold: true, color: WHITE, valign: 'middle' })
      s4.addText('Niveau requis', { x: 9.0, y: 1.0, w: 3.5, h: 0.5, fontSize: 12, bold: true, color: WHITE, valign: 'middle', align: 'center' })

      activity.requiredSkills.slice(0, 10).forEach((skill, i) => {
        const y = 1.55 + i * 0.52
        const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE
        s4.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12.5, h: 0.48, fill: { color: bg } })
        s4.addText(skill.skill_name, { x: 0.6, y, w: 8, h: 0.48, fontSize: 11, color: TEXT_DARK, valign: 'middle' })

        const levelColor = skill.desired_level === 'expert' ? 'DC2626'
          : skill.desired_level === 'high' ? '2563EB'
          : skill.desired_level === 'medium' ? 'D97706'
          : '16A34A'
        s4.addShape(pptx.ShapeType.roundRect, { x: 9.2, y: y + 0.06, w: 2.8, h: 0.34, fill: { color: levelColor }, rectRadius: 0.08 })
        s4.addText(LEVEL_LABELS[skill.desired_level] ?? skill.desired_level, {
          x: 9.2, y: y + 0.06, w: 2.8, h: 0.34,
          fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle',
        })
      })
    }

    // ── Slide 5 : Merci ───────────────────────────────────────────────────
    const s5 = pptx.addSlide()
    s5.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK_BLUE } })
    s5.addShape(pptx.ShapeType.rect, { x: 0, y: 2.8, w: '100%', h: 0.08, fill: { color: ORANGE } })
    s5.addText('Merci pour votre attention', {
      x: 0, y: 1.5, w: '100%', h: 1.2,
      fontSize: 32, bold: true, color: WHITE, align: 'center',
    })
    s5.addText('SkillUpTN — Système de recommandation intelligent', {
      x: 0, y: 3.2, w: '100%', h: 0.6,
      fontSize: 14, color: TEXT_MUTED, align: 'center',
    })

    // Générer le buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
    return buffer
  }
}
