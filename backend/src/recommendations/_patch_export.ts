/**
 * Temporary patch script — run once then delete.
 * Appends exportRecommendations() to recommendation.service.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const filePath = path.join(__dirname, 'recommendation.service.ts')
let content = fs.readFileSync(filePath, 'utf8')

// Remove existing closing brace at end of class
content = content.replace(/\}\s*\r?\n\s*\r?\n?\s*$/, '')

const exportMethod = `
  // ─── Export (PDF / Excel) ────────────────────────────────────────────────

  async exportRecommendations(
    activityId: string,
    format: 'pdf' | 'excel',
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    if (!isValidObjectId(activityId)) {
      throw new HttpException('Invalid activity id', HttpStatus.BAD_REQUEST)
    }

    const activity = await this.activityModel.findById(activityId).exec()
    if (!activity) throw new HttpException('Activity not found', HttpStatus.NOT_FOUND)

    const recs = await this.recommendationModel
      .find({ activityId: new Types.ObjectId(activityId) })
      .populate('userId', 'name email')
      .sort({ score_total: -1, rank: 1 })
      .exec()

    const activityTitle: string = (activity as any).titre ?? (activity as any).title ?? 'Activite'

    const rows = recs.map((rec: any) => {
      const employee: string = rec.userId?.name ?? rec.userId?.email ?? 'N/A'
      const scoreGlobal: string = Number(rec.score_total ?? 0).toFixed(2)
      const hardSkills: string = Array.isArray(rec.matched_skills)
        ? rec.matched_skills
            .map((s: any) => {
              const name = String(s?.intitule ?? s?.skill_name ?? s?.name ?? '')
              const lvl = s?.niveau ?? s?.level ?? s?.score
              return lvl !== undefined ? \`\${name} (\${lvl})\` : name
            })
            .filter(Boolean)
            .join(', ')
        : ''
      const raison: string = String(rec.recommendation_reason ?? '')
      return [employee, scoreGlobal, hardSkills, raison]
    })

    const headers = ['Employe', 'Score Global', 'Hard Skills', 'Raison']

    if (format === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { jsPDF } = require('jspdf')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(14)
      doc.text(\`Recommandations - \${activityTitle}\`, 14, 16)
      doc.setFontSize(9)
      doc.text(\`Exporte le \${new Date().toLocaleDateString('fr-FR')}\`, 14, 23)
      ;(doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 90 },
          3: { cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        margin: { left: 14, right: 14 },
      })
      const pdfArrayBuffer: ArrayBuffer = doc.output('arraybuffer')
      const buffer = Buffer.from(pdfArrayBuffer)
      const safeTitle = activityTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 40)
      return { buffer, filename: \`recommandations_\${safeTitle}.pdf\`, mimeType: 'application/pdf' }
    } else {
      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 55 }, { wch: 60 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Recommandations')
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
      const safeTitle = activityTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 40)
      return {
        buffer: excelBuffer,
        filename: \`recommandations_\${safeTitle}.xlsx\`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    }
  }
}
`

fs.writeFileSync(filePath, content + exportMethod, 'utf8')
console.log('Patch applied successfully.')
