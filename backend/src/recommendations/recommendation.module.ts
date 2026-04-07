import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'

import { RecommendationController } from './recommendation.controller'
import { RecommendationService } from './recommendation.service'
import { CertificateService } from './certificate.service'
import { Recommendation, RecommendationSchema } from './schemas/recommendation.schema'
import { User, UserSchema } from '../users/schemas/user.schema'
import { Fiche, FicheSchema } from '../users/schemas/fiche.schema'
import { Competence, CompetenceSchema } from '../users/schemas/competence.schema'
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema'
import { Department, DepartmentSchema } from '../users/schemas/department.schema'
import { QuestionCompetence, QuestionCompetenceSchema } from '../users/schemas/question-competence.schema'
import { Certificate, CertificateSchema } from './schemas/certificate.schema'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MailModule } from '../mail/mail.module'
import { ActivityHistory, ActivityHistorySchema } from './schemas/activity-history.schema'
import { PostActivityEvaluation, PostActivityEvaluationSchema } from './schemas/post-activity-evaluation.schema'
import { AuditModule } from '../audit/audit.module'
import { SmsModule } from '../sms/sms.module'

@Module({
  imports: [
    HttpModule,
    AuthModule,
    NotificationsModule,
    MailModule,
    AuditModule,
    SmsModule,
    MongooseModule.forFeature([
      { name: Recommendation.name, schema: RecommendationSchema },
      { name: User.name, schema: UserSchema },
      { name: Fiche.name, schema: FicheSchema },
      { name: Competence.name, schema: CompetenceSchema },
      { name: QuestionCompetence.name, schema: QuestionCompetenceSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: ActivityHistory.name, schema: ActivityHistorySchema },
      { name: PostActivityEvaluation.name, schema: PostActivityEvaluationSchema },
      { name: Certificate.name, schema: CertificateSchema },
    ]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService, CertificateService],
  exports: [RecommendationService],
})
export class RecommendationModule {}

