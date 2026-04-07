import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

// ✅ Schemas du dossier users/schemas/ (déjà existants)
import { User, UserSchema } from '../users/schemas/user.schema';
import { Department, DepartmentSchema } from '../users/schemas/department.schema';
import { Fiche, FicheSchema } from '../users/schemas/fiche.schema';
import { Competence, CompetenceSchema } from '../users/schemas/competence.schema';

// ✅ Schema du dossier activities/schemas/ (déjà existant)
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';
import { ActivityRequest, ActivityRequestSchema } from './schemas/activity-request.schema';
import { Recommendation, RecommendationSchema } from '../recommendations/schemas/recommendation.schema';

// ✅ Module Auth pour JwtAuthGuard et RolesGuard
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: ActivityRequest.name, schema: ActivityRequestSchema },
      { name: Fiche.name, schema: FicheSchema },
      { name: Competence.name, schema: CompetenceSchema },
      { name: Recommendation.name, schema: RecommendationSchema },
    ]),
    AuthModule, // Pour utiliser JwtAuthGuard et RolesGuard
    NotificationsModule,
    MailModule,
  ],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}