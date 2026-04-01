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

  /**
   * Génère un PPTX enrichi pour le Manager.
   * Inclut les slides de base + slides supplémentaires extraites d'un fichier docx/pdf.
   */
  async generateEnrichedPresentation(
    activity: ActivityPptxData,
    fileBuffer?: Buffer,
    mimeType?: string,
  ): Promise<Buffer> {
    // Extraire le texte du fichier joint si présent
    let extraText = ''
    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const mime = (mimeType ?? '').toLowerCase()
        const isPdf = mime.includes('pdf')
        const isDocx = mime.includes('word') || mime.includes('docx') || mime.includes('openxmlformats') || mime.includes('document')
        const isTxt = mime.includes('text') || mime.includes('plain')

        if (isPdf) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
          const parsed = await pdfParse(fileBuffer)
          extraText = parsed.text ?? ''
        } else if (isDocx) {
          const mammoth = await import('mammoth')
          const result = await mammoth.extractRawText({ buffer: fileBuffer })
          extraText = result.value ?? ''
        } else if (isTxt) {
          // Fichier texte brut (.txt)
          extraText = fileBuffer.toString('utf-8')
        } else {
          // Tentative générique : essayer comme texte
          extraText = fileBuffer.toString('utf-8')
        }
      } catch (err) {
        // Si extraction échoue, continuer sans texte supplémentaire
        extraText = ''
      }
    }

    // Générer les slides de base (identiques au RH)
    const baseBuffer = await this.generateActivityPresentation(activity)

    // Si pas de texte supplémentaire, retourner le PPTX de base
    if (!extraText.trim()) return baseBuffer

    // Reconstruire avec les slides enrichies
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    pptx.author = 'SkillUpTN — Manager'
    pptx.title = activity.title

    const fmt = (d: Date | string) =>
      new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const typeLabel: Record<string, string> = {
      training: 'Formation', certification: 'Certification',
      project: 'Projet', mission: 'Mission', audit: 'Audit',
    }

    // ── Slide 1 : Couverture Manager ─────────────────────────────────────
    const s1 = pptx.addSlide()
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK_BLUE } })
    s1.addShape(pptx.ShapeType.rect, { x: 0, y: 3.5, w: '100%', h: 2.5, fill: { color: ORANGE } })
    s1.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.4, w: 2.2, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE }, rectRadius: 0.1 })
    s1.addText(`${typeLabel[activity.type] ?? activity.type} — Manager`, { x: 0.5, y: 0.4, w: 2.2, h: 0.45, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' })
    s1.addText(activity.title, { x: 0.5, y: 1.0, w: 12.3, h: 1.8, fontSize: 36, bold: true, color: WHITE, align: 'left', valign: 'middle', wrap: true })
    s1.addText(`${fmt(activity.startDate)} → ${fmt(activity.endDate)}`, { x: 0.5, y: 3.6, w: 8, h: 0.5, fontSize: 16, color: WHITE, align: 'left' })
    s1.addText(`${activity.maxParticipants} participant(s) · ${activity.location ?? 'Lieu à définir'}`, { x: 0.5, y: 4.2, w: 8, h: 0.45, fontSize: 14, color: WHITE, align: 'left' })
    s1.addText('SkillUpTN', { x: 10.5, y: 5.3, w: 2.5, h: 0.5, fontSize: 13, bold: true, color: WHITE, align: 'right' })

    // ── Slide 2 : Description ────────────────────────────────────────────
    const s2 = pptx.addSlide()
    s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: DARK_BLUE } })
    s2.addText('Description & Objectifs', { x: 0.4, y: 0, w: 12, h: 0.8, fontSize: 20, bold: true, color: WHITE, valign: 'middle' })
    s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.0, w: 0.08, h: 1.2, fill: { color: ORANGE } })
    s2.addText('Description', { x: 0.7, y: 1.0, w: 3, h: 0.4, fontSize: 13, bold: true, color: DARK_BLUE })
    s2.addText(activity.description || 'Aucune description fournie.', { x: 0.7, y: 1.4, w: 12, h: 1.0, fontSize: 12, color: TEXT_DARK, wrap: true })
    if (activity.objectifs) {
      s2.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.7, w: 0.08, h: 1.2, fill: { color: ORANGE } })
      s2.addText('Objectifs', { x: 0.7, y: 2.7, w: 3, h: 0.4, fontSize: 13, bold: true, color: DARK_BLUE })
      s2.addText(activity.objectifs, { x: 0.7, y: 3.1, w: 12, h: 1.5, fontSize: 12, color: TEXT_DARK, wrap: true })
    }

    // ── Slides supplémentaires : contenu du fichier joint avec mise en forme ──
    // Découper le texte en sections basées sur les titres (lignes en majuscules ou avec ===)
    const cleanText = extraText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

    // Détecter les sections : ligne tout en majuscules ou ligne suivie de === ou ---
    const isSectionTitle = (line: string): boolean => {
      const t = line.trim()
      if (!t) return false
      if (/^={3,}$/.test(t) || /^-{3,}$/.test(t)) return false
      // Titre si : tout en majuscules, ou ligne suivie de === dans le texte original
      return /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ\s\d\-—:()]{4,}$/.test(t) || t.endsWith('---') || t.endsWith('===')
    }

    const isSubTitle = (line: string): boolean => {
      const t = line.trim()
      return /^(JOUR\s+\d|Matin|Après-midi|Soir|\d+\.\s|[A-Z][a-z]+\s+\d)/i.test(t) && t.length < 60
    }

    const isBullet = (line: string): boolean => {
      return /^\s*[-•*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)
    }

    // Grouper les lignes en sections (chaque section = une slide)
    const lines = cleanText.split('\n')
    type Section = { title: string; items: { text: string; level: 'subtitle' | 'bullet' | 'text' }[] }
    const sections: Section[] = []
    let currentSection: Section = { title: '', items: [] }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const next = lines[i + 1] ?? ''
      const trimmed = line.trim()

      // Ignorer les lignes de séparation
      if (/^[=\-]{3,}$/.test(trimmed)) continue

      // Détecter titre de section (ligne suivie de === ou --- ou tout en majuscules)
      const isFollowedBySeparator = /^[=\-]{3,}$/.test(next.trim())
      if ((isSectionTitle(trimmed) || isFollowedBySeparator) && trimmed.length > 0) {
        if (currentSection.title || currentSection.items.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { title: trimmed, items: [] }
        continue
      }

      if (!trimmed) continue

      if (isSubTitle(trimmed)) {
        currentSection.items.push({ text: trimmed, level: 'subtitle' })
      } else if (isBullet(line)) {
        currentSection.items.push({ text: trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''), level: 'bullet' })
      } else {
        currentSection.items.push({ text: trimmed, level: 'text' })
      }
    }
    if (currentSection.title || currentSection.items.length > 0) {
      sections.push(currentSection)
    }

    // Si pas de sections détectées, créer une section unique
    if (sections.length === 0) {
      sections.push({ title: 'Programme détaillé', items: lines.filter(l => l.trim()).map(l => ({ text: l.trim(), level: 'text' as const })) })
    }

    // Générer une slide par section (max 12 items par slide, sinon découper)
    const MAX_ITEMS = 10
    const allSlideData: Section[] = []
    for (const section of sections) {
      if (section.items.length <= MAX_ITEMS) {
        allSlideData.push(section)
      } else {
        // Découper en sous-slides
        for (let i = 0; i < section.items.length; i += MAX_ITEMS) {
          allSlideData.push({
            title: section.items.length > MAX_ITEMS ? `${section.title} (suite)` : section.title,
            items: section.items.slice(i, i + MAX_ITEMS),
          })
          if (i === 0) allSlideData[allSlideData.length - 1].title = section.title
        }
      }
    }

    allSlideData.forEach((section, idx) => {
      const slide = pptx.addSlide()

      // Header
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: DARK_BLUE } })
      slide.addText(section.title || `Programme (${idx + 1}/${allSlideData.length})`, {
        x: 0.4, y: 0, w: 12.5, h: 0.75,
        fontSize: 17, bold: true, color: WHITE, valign: 'middle',
      })
      // Numéro de slide
      slide.addText(`${idx + 1} / ${allSlideData.length}`, {
        x: 11.5, y: 0, w: 1.8, h: 0.75,
        fontSize: 10, color: '9CA3AF', align: 'right', valign: 'middle',
      })

      // Barre orange décorative
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.75, w: '100%', h: 0.04, fill: { color: ORANGE } })

      // Contenu avec mise en forme par type
      let yPos = 1.0
      for (const item of section.items) {
        if (yPos > 5.4) break // Sécurité débordement

        if (item.level === 'subtitle') {
          // Sous-titre : fond gris clair + texte bleu foncé bold
          slide.addShape(pptx.ShapeType.rect, { x: 0.3, y: yPos, w: 12.8, h: 0.42, fill: { color: 'E8F0FE' } })
          slide.addShape(pptx.ShapeType.rect, { x: 0.3, y: yPos, w: 0.06, h: 0.42, fill: { color: ORANGE } })
          slide.addText(item.text, {
            x: 0.55, y: yPos, w: 12.5, h: 0.42,
            fontSize: 12, bold: true, color: DARK_BLUE, valign: 'middle',
          })
          yPos += 0.5

        } else if (item.level === 'bullet') {
          // Point de liste : puce orange + texte normal
          slide.addShape(pptx.ShapeType.ellipse, { x: 0.55, y: yPos + 0.12, w: 0.1, h: 0.1, fill: { color: ORANGE } })
          slide.addText(item.text, {
            x: 0.8, y: yPos, w: 12.3, h: 0.38,
            fontSize: 11, color: TEXT_DARK, valign: 'middle', wrap: true,
          })
          yPos += 0.42

        } else {
          // Texte normal : léger retrait
          slide.addText(item.text, {
            x: 0.6, y: yPos, w: 12.3, h: 0.36,
            fontSize: 10.5, color: TEXT_MUTED, valign: 'middle', wrap: true, italic: false,
          })
          yPos += 0.38
        }
      }
    })

    // ── Slide finale : Merci ─────────────────────────────────────────────
    const sf = pptx.addSlide()
    sf.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK_BLUE } })
    sf.addShape(pptx.ShapeType.rect, { x: 0, y: 2.8, w: '100%', h: 0.08, fill: { color: ORANGE } })
    sf.addText('Merci pour votre attention', { x: 0, y: 1.5, w: '100%', h: 1.2, fontSize: 32, bold: true, color: WHITE, align: 'center' })
    sf.addText('SkillUpTN — Système de recommandation intelligent', { x: 0, y: 3.2, w: '100%', h: 0.6, fontSize: 14, color: TEXT_MUTED, align: 'center' })

    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
    return buffer
  }
}
