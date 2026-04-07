import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ConfirmParticipantsDto } from './dto/confirm-participants.dto';
import { AddEmployeeDto } from './dto/add-employee.dto';
import { EvaluateCompetenceDto } from './dto/evaluate-competence.dto';
import { CreateActivityRequestDto } from './dto/create-activity-request.dto';
import { ReviewActivityRequestDto } from './dto/review-activity-request.dto';

// ✅ Même imports que users.controller.ts
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/auth/roles/roles.guard';
import { Roles } from '../auth/auth/roles.decorator';

@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')  // Toutes les routes = MANAGER seulement
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  // ─────────────────────────────────────
  // DASHBOARD
  // GET /manager/dashboard
  // ─────────────────────────────────────
  @Get('dashboard')
async getDashboard(@Request() req) {
  const managerId = req.user.sub ?? req.user.userId;
  return this.managerService.getDashboard(managerId);
}

  @Post('activity-requests')
  @Roles('MANAGER')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createActivityRequest(@Body() dto: CreateActivityRequestDto, @Request() req) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.createActivityRequest(managerId, dto);
  }

  @Get('activity-requests/my')
  @Roles('MANAGER')
  async myRequests(@Request() req) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.getMyActivityRequests(managerId);
  }

  @Get('activity-requests')
  @Roles('HR')
  async getRequestsForHR() {
    return this.managerService.getActivityRequestsForHR();
  }

  @Patch('activity-requests/:id/review')
  @Roles('HR')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reviewRequest(@Param('id') id: string, @Body() dto: ReviewActivityRequestDto, @Request() req) {
    const hrId = req.user.sub ?? req.user.userId;
    return this.managerService.reviewActivityRequest(hrId, id, dto);
  }
  // ─────────────────────────────────────
  // ACTIVITÉS
  // ─────────────────────────────────────

  /**
   * GET /manager/activities
   * Liste toutes les activités du département du manager connecté
   */
  @Get('activities')
  async getMyActivities(@Request() req) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.getMyActivities(managerId);
  }

  /**
   * GET /manager/activities/:id
   * Détail d'une activité
   */
  @Get('activities/:id')
  async getActivityDetail(@Param('id') id: string) {
    return this.managerService.getActivityDetail(id);
  }

  // ─────────────────────────────────────
  // PARTICIPANTS
  // ─────────────────────────────────────

  /**
   * POST /manager/activities/:id/confirm
   * Confirmer / Rejeter des participants recommandés par l'IA
   * Body: { confirmedEmployeeIds: [], rejectedEmployeeIds: [] }
   */
  @Post('activities/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async confirmParticipants(
    @Param('id') id: string,
    @Body() dto: ConfirmParticipantsDto,
    @Request() req,
  ) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.confirmParticipants(id, dto, managerId);
  }

  /**
   * POST /manager/activities/:id/add-employee
   * Ajouter un employé manuellement à l'activité
   * Body: { employeeId: string, score?: number }
   */
  @Post('activities/:id/add-employee')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addEmployeeManually(
    @Param('id') id: string,
    @Body() dto: AddEmployeeDto,
  ) {
    return this.managerService.addEmployeeManually(id, dto);
  }

  // ─────────────────────────────────────
  // EMPLOYÉS
  // ─────────────────────────────────────

  /**
   * GET /manager/employees
   * Liste des employés du département du manager
   */
  @Get('employees')
  async getMyEmployees(@Request() req) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.getMyEmployees(managerId);
  }

  /**
   * GET /manager/employees/search?q=ahmed
   * Rechercher un employé par nom, matricule ou email
   */
  @Get('employees/search')
  async searchEmployees(
    @Query('q') query: string,
    @Request() req,
  ) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.searchEmployees(query, managerId);
  }

  // ─────────────────────────────────────
  // FICHES & COMPÉTENCES (Étape 10)
  // ─────────────────────────────────────

  /**
   * GET /manager/employees/:id/fiches
   * Voir les fiches d'évaluation d'un employé
   */
  @Get('employees/:id/fiches')
  async getEmployeeFiches(@Param('id') employeeId: string, @Request() req) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.getEmployeeFiches(employeeId, managerId);
  }

  /**
   * GET /manager/fiches/:id/competences
   * Voir les compétences d'une fiche (avec auto_eval déjà rempli par l'employé)
   */
  @Get('fiches/:id/competences')
  async getFicheCompetences(@Param('id') ficheId: string) {
    return this.managerService.getFicheCompetences(ficheId);
  }

  /**
   * PATCH /manager/competences/evaluate
   * Saisir la note hiérarchique (hierarchie_eval) dans Competence table
   * Body: { competenceId, hierarchie_eval (0-10), commentaire? }
   */
  @Patch('competences/evaluate')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async evaluateCompetence(
    @Body() dto: EvaluateCompetenceDto,
    @Request() req,
  ) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.evaluateCompetence(dto, managerId);
  }

  /**
   * POST /manager/activities/:activityId/send-invitation/:employeeId
   * Envoyer un email d'invitation à un employé accepté pour une activité
   */
  @Post('activities/:activityId/send-invitation/:employeeId')
  @HttpCode(HttpStatus.OK)
  async sendActivityInvitation(
    @Param('activityId') activityId: string,
    @Param('employeeId') employeeId: string,
    @Request() req,
  ) {
    const managerId = req.user.sub ?? req.user.userId;
    return this.managerService.sendActivityInvitation(activityId, employeeId, managerId);
  }
}