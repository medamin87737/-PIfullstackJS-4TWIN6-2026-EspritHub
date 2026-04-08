import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as handlebars from 'handlebars'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: Number(process.env.MAIL_PORT ?? 587) === 465,
    auth: process.env.MAIL_USER && process.env.MAIL_PASS
      ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      : undefined,
  })

  async sendEmployeeInvitation(
    to: string,
    employeeName: string,
    activityTitle: string,
    activityDate: Date,
    activityLocation: string,
    activityDescription: string,
    acceptUrl: string,
    declineUrl: string,
  ) {
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new ServiceUnavailableException(
        'Mail service not configured. Please set MAIL_HOST, MAIL_USER and MAIL_PASS in backend/.env',
      )
    }

    try {
      const templateCandidates = [
        path.join(__dirname, 'templates', 'employee-invitation.hbs'),
        path.join(process.cwd(), 'dist', 'mail', 'templates', 'employee-invitation.hbs'),
        path.join(process.cwd(), 'src', 'mail', 'templates', 'employee-invitation.hbs'),
      ]
      const templatePath = await (async () => {
        for (const p of templateCandidates) {
          try {
            await fs.access(p)
            return p
          } catch {
            // try next candidate
          }
        }
        throw new Error(`Invitation template not found. Checked: ${templateCandidates.join(', ')}`)
      })()
      const source = await fs.readFile(templatePath, 'utf-8')
      const html = handlebars.compile(source)({
        employeeName,
        activityTitle,
        activityDate: new Date(activityDate).toLocaleString('fr-FR'),
        activityLocation,
        activityDescription,
        acceptUrl,
        declineUrl,
      })

      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'HR System <noreply@company.com>',
        to,
        subject: `Invitation - ${activityTitle}`,
        html,
      })
    } catch (err: any) {
      this.logger.error(`Failed to send invitation email to ${to}: ${String(err?.message ?? err)}`)
      throw new InternalServerErrorException('Unable to send invitation email')
    }
  }
}

