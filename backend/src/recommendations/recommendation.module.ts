import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'

import { RecommendationController } from './recommendation.controller'
import { RecommendationService } from './recommendation.service'
import { Recommendation, RecommendationSchema } from './schemas/recommendation.schema'
import { User, UserSchema } from '../users/schemas/user.schema'
import { Fiche, FicheSchema } from '../users/schemas/fiche.schema'
import { Competence, CompetenceSchema } from '../users/schemas/competence.schema'
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema'
import { Department, DepartmentSchema } from '../users/schemas/department.schema'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MailModule } from '../mail/mail.module'
import { ActivityHistory, ActivityHistorySchema } from './schemas/activity-history.schema'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [
    HttpModule,
    AuthModule,
    NotificationsModule,
    MailModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: Recommendation.name, schema: RecommendationSchema },
      { name: User.name, schema: UserSchema },
      { name: Fiche.name, schema: FicheSchema },
      { name: Competence.name, schema: CompetenceSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: ActivityHistory.name, schema: ActivityHistorySchema },
    ]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}

