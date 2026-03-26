import { Injectable, Logger } from '@nestjs/common'
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
    try {
      const templatePath = path.join(__dirname, 'templates', 'employee-invitation.hbs')
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
    } catch (err) {
      this.logger.warn(`Failed to send invitation email to ${to}: ${String(err)}`)
    }
  }
}

