import {forwardRef, Module} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Fiche, FicheSchema } from './schemas/fiche.schema';
import { Competence, CompetenceSchema } from './schemas/competence.schema';
import { QuestionCompetence, QuestionCompetenceSchema } from './schemas/question-competence.schema';
import {AuthModule} from "../auth/auth.module";
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Fiche.name, schema: FicheSchema },
      { name: Competence.name, schema: CompetenceSchema },
      { name: QuestionCompetence.name, schema: QuestionCompetenceSchema },
    ]),
    forwardRef(() => AuthModule), // Permet d'éviter la dépendance circulaire

  ],
  controllers: [UsersController, DepartmentsController],
  providers: [UsersService, DepartmentsService],
  exports: [UsersService, DepartmentsService], // Exporter pour utiliser dans d'autres modules
})
export class UsersModule {}
