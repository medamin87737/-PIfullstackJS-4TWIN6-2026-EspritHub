import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole, UserStatus } from './schemas/user.schema';
import { Fiche, FicheDocument } from './schemas/fiche.schema';
import { Competence, CompetenceDocument } from './schemas/competence.schema';
import { QuestionCompetence, QuestionCompetenceDocument } from './schemas/question-competence.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Fiche.name) private ficheModel: Model<FicheDocument>,
    @InjectModel(Competence.name) private competenceModel: Model<CompetenceDocument>,
    @InjectModel(QuestionCompetence.name) private questionCompetenceModel: Model<QuestionCompetenceDocument>,
  ) {}

  /**
   * Créer un nouvel utilisateur (inscription)
   */
  async create(createUserDto: CreateUserDto): Promise<any> {
    try {
      // Vérifier si l'email existe déjà
      const existingUserByEmail = await this.userModel.findOne({
        email: createUserDto.email.toLowerCase(),
      });

      if (existingUserByEmail) {
        throw new ConflictException('Cet email est déjà utilisé');
      }

      // Vérifier si le matricule existe déjà
      const existingUserByMatricule = await this.userModel.findOne({
        matricule: createUserDto.matricule,
      });

      if (existingUserByMatricule) {
        throw new ConflictException('Ce matricule est déjà utilisé');
      }

      // Vérifier que le manager existe si manager_id est fourni
      if (createUserDto.manager_id) {
        if (!isValidObjectId(createUserDto.manager_id)) {
          throw new BadRequestException('ID du manager invalide');
        }
        const manager = await this.userModel.findById(createUserDto.manager_id);
        if (!manager) {
          throw new NotFoundException('Manager non trouvé');
        }
      }

      // Hasher le mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      // Préparer les données utilisateur
      const userData: any = {
        name: createUserDto.name,
        matricule: createUserDto.matricule,
        telephone: createUserDto.telephone,
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
        date_embauche: new Date(createUserDto.date_embauche),
        status: createUserDto.status || UserStatus.ACTIVE,
        role: createUserDto.role || UserRole.EMPLOYEE,
        en_ligne: false,
      };

      // Convertir department_id en ObjectId si fourni
      if (createUserDto.department_id) {
        if (!isValidObjectId(createUserDto.department_id)) {
          throw new BadRequestException('ID du département invalide');
        }
        userData.department_id = new Types.ObjectId(createUserDto.department_id);
      }

      // Convertir manager_id en ObjectId si fourni
      if (createUserDto.manager_id) {
        userData.manager_id = new Types.ObjectId(createUserDto.manager_id);
      }

      // Créer l'utilisateur
      const newUser = new this.userModel(userData);
      const savedUser = await newUser.save();

      // Retourner sans le mot de passe
      return {
        message: 'Utilisateur créé avec succès',
        user: this.sanitizeUser(savedUser),
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Erreur lors de la création de l'utilisateur: " + error.message,
      );
    }
  }

  /**
   * Connexion utilisateur
   */
  async login(loginUserDto: LoginUserDto): Promise<any> {
    try {
      // Trouver l'utilisateur par email
      const user = await this.userModel.findOne({
        email: loginUserDto.email.toLowerCase(),
      });

      if (!user) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Vérifier si le compte est actif (utiliser status au lieu de isActive)
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException(
          "Votre compte n'est pas actif. Contactez l'administrateur",
        );
      }

      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(
        loginUserDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Mettre à jour le statut en ligne
      user.en_ligne = true;
      await user.save();

      // Retourner les informations utilisateur
      return {
        message: 'Connexion réussie',
        user: this.sanitizeUser(user),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(
        'Erreur lors de la connexion: ' + error.message,
      );
    }
  }

  /**
   * Trouver tous les utilisateurs
   */
  async findAll(): Promise<any[]> {
    const users = await this.userModel.find().exec();
    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Trouver un utilisateur par ID
   */
  async findById(id: string): Promise<any> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Trouver un utilisateur par email (pour usage interne)
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findOrCreateGoogleUser(profile: { email: string; name: string; providerId: string }) {
    const normalizedEmail = profile.email.trim().toLowerCase()
    let user = await this.userModel.findOne({ email: normalizedEmail })
    if (user) return user

    const pseudoMatricule = `GOOG-${profile.providerId.slice(-8).toUpperCase()}`
    const existingMatricule = await this.userModel.findOne({ matricule: pseudoMatricule })
    const matricule = existingMatricule ? `GOOG-${Date.now().toString().slice(-8)}` : pseudoMatricule
    const randomPassword = await bcrypt.hash(`google-${profile.providerId}-${Date.now()}`, 10)

    user = await this.userModel.create({
      name: profile.name || 'Google User',
      matricule,
      telephone: '00000000',
      email: normalizedEmail,
      password: randomPassword,
      date_embauche: new Date(),
      status: UserStatus.ACTIVE,
      role: UserRole.EMPLOYEE,
      en_ligne: false,
    })
    return user
  }

  /**
   * Supprimer les informations sensibles de l'utilisateur
   */

  // rendre sanitizeUser publique pour controller Auth
  sanitizeUser(user: UserDocument) {
    const userObj = user.toObject();
    const { password, __v, ...sanitizedUser } = userObj;
    return sanitizedUser;
  }

  /**
   * Mettre à jour un utilisateur par ID
   */
  async updateById(id: string, dto: any) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID invalide');
    }

    // Préparer les données de mise à jour
    const updateData: any = { ...dto };

    // Convertir date_embauche en Date si fourni
    if (dto.date_embauche) {
      updateData.date_embauche = new Date(dto.date_embauche);
    }

    // Convertir department_id en ObjectId si fourni
    if (dto.department_id) {
      if (!isValidObjectId(dto.department_id)) {
        throw new BadRequestException('ID du département invalide');
      }
      updateData.department_id = new Types.ObjectId(dto.department_id);
    }

    // Convertir manager_id en ObjectId si fourni
    if (dto.manager_id) {
      if (!isValidObjectId(dto.manager_id)) {
        throw new BadRequestException('ID du manager invalide');
      }
      // Vérifier que le manager existe
      const manager = await this.userModel.findById(dto.manager_id);
      if (!manager) {
        throw new NotFoundException('Manager non trouvé');
      }
      updateData.manager_id = new Types.ObjectId(dto.manager_id);
    }

    // Hasher le mot de passe si fourni
    if (dto.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(dto.password, saltRounds);
    }

    const updated = await this.userModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      message: 'Utilisateur mis à jour avec succès',
      user: this.sanitizeUser(updated),
    };
  }


  /**
   * Supprimer un utilisateur par ID
   */
  async deleteById(id: string): Promise<any> {
    const deleted = await this.userModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      message: 'Utilisateur supprimé avec succès',
      user: this.sanitizeUser(deleted),
    };
  }

  /**
   * Mettre à jour le statut en ligne d'un utilisateur
   */
  async updateOnlineStatus(id: string, isOnline: boolean): Promise<any> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID invalide');
    }

    const updated = await this.userModel.findByIdAndUpdate(
      id,
      { en_ligne: isOnline },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      message: `Statut en ligne mis à jour: ${isOnline ? 'en ligne' : 'hors ligne'}`,
      user: this.sanitizeUser(updated),
    };
  }

  private ensureCanAccessUserData(requesterId: string, requesterRole: string, targetUserId: string) {
    const role = String(requesterRole ?? '').toUpperCase();
    if (role === 'ADMIN' || role === 'HR' || role === 'MANAGER') return;
    if (role === 'EMPLOYEE' && requesterId === targetUserId) return;
    throw new UnauthorizedException("Accès refusé aux données d'évaluation");
  }

  async getUserFiches(targetUserId: string, requesterId: string, requesterRole: string) {
    if (!isValidObjectId(targetUserId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }
    this.ensureCanAccessUserData(requesterId, requesterRole, targetUserId);

    const employee = await this.userModel
      .findById(targetUserId)
      .select('_id name matricule email department_id role')
      .exec();
    if (!employee) throw new NotFoundException('Utilisateur introuvable');

    const fiches = await this.ficheModel
      .find({ user_id: new Types.ObjectId(targetUserId) })
      .sort({ createdAt: -1 })
      .exec();

    return {
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        matricule: employee.matricule,
        email: employee.email,
        role: employee.role,
      },
      fiches,
      total: fiches.length,
    };
  }

  async getFicheCompetences(ficheId: string, requesterId: string, requesterRole: string) {
    if (!isValidObjectId(ficheId)) {
      throw new BadRequestException('ID fiche invalide');
    }
    const fiche = await this.ficheModel.findById(ficheId).exec();
    if (!fiche) throw new NotFoundException('Fiche introuvable');

    this.ensureCanAccessUserData(requesterId, requesterRole, String(fiche.user_id));

    const competences = await this.competenceModel
      .find({ fiches_id: new Types.ObjectId(ficheId) })
      .populate('question_competence_id', 'intitule details')
      .sort({ type: 1, createdAt: -1 })
      .exec();

    return {
      fiche,
      competences,
      total: competences.length,
    };
  }

  async getAllCompetences(requesterRole: string) {
    const role = String(requesterRole ?? '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'HR') {
      throw new UnauthorizedException('Accès réservé HR/ADMIN');
    }

    const rows = await this.competenceModel
      .find({})
      .populate('question_competence_id', 'intitule details')
      .populate({
        path: 'fiches_id',
        select: 'user_id saisons etat',
        populate: { path: 'user_id', select: 'name matricule email role department_id' },
      })
      .sort({ updatedAt: -1 })
      .exec();

    return rows.map((c: any) => ({
      id: c._id?.toString?.() ?? '',
      intitule: c.intitule ?? '',
      type: c.type ?? 'knowledge',
      auto_eval: Number(c.auto_eval ?? 0),
      hierarchie_eval: Number(c.hierarchie_eval ?? 0),
      etat: c.etat ?? 'draft',
      question: {
        id: c.question_competence_id?._id?.toString?.() ?? '',
        intitule: c.question_competence_id?.intitule ?? '',
        details: c.question_competence_id?.details ?? '',
      },
      fiche: {
        id: c.fiches_id?._id?.toString?.() ?? '',
        saisons: c.fiches_id?.saisons ?? '',
        etat: c.fiches_id?.etat ?? '',
      },
      user: {
        id: c.fiches_id?.user_id?._id?.toString?.() ?? '',
        name: c.fiches_id?.user_id?.name ?? 'N/A',
        matricule: c.fiches_id?.user_id?.matricule ?? '',
        email: c.fiches_id?.user_id?.email ?? '',
        role: c.fiches_id?.user_id?.role ?? '',
        department_id: c.fiches_id?.user_id?.department_id?.toString?.() ?? '',
      },
      created_at: c.createdAt ?? null,
      updated_at: c.updatedAt ?? null,
    }));
  }

  async getAllQuestionCompetences(requesterRole: string) {
    const role = String(requesterRole ?? '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'HR') {
      throw new UnauthorizedException('Accès réservé HR/ADMIN');
    }

    const rows = await this.questionCompetenceModel
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .exec();

    return rows.map((q: any) => ({
      id: q._id?.toString?.() ?? '',
      intitule: q.intitule ?? '',
      details: q.details ?? '',
      status: q.status ?? 'inactive',
      created_at: q.createdAt ?? null,
      updated_at: q.updatedAt ?? null,
    }));
  }

}
