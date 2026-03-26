import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsMongoId,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { UserRole, UserStatus } from '../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  name?: string; // Nom complet

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Le matricule ne peut pas dépasser 50 caractères' })
  matricule?: string; // Numéro d'enregistrement employé

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le numéro de téléphone ne peut pas dépasser 20 caractères' })
  telephone?: string; // Numéro de téléphone

  @IsOptional()
  @IsEmail()
  @MaxLength(255, { message: "L'email ne peut pas dépasser 255 caractères" })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  @MaxLength(255, { message: 'Le mot de passe ne peut pas dépasser 255 caractères' })
  password?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date d\'embauche doit être une date valide' })
  date_embauche?: string; // Date d'embauche

  @IsOptional()
  @IsMongoId({ message: 'L\'ID du département doit être un ObjectId valide' })
  department_id?: string; // Référence au département

  @IsOptional()
  @IsMongoId({ message: 'L\'ID du manager doit être un ObjectId valide' })
  manager_id?: string; // Référence au manager

  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'Statut invalide. Valeurs acceptées: ACTIVE, INACTIVE, SUSPENDED, TERMINATED',
  })
  status?: UserStatus; // Statut utilisateur

  @IsOptional()
  @IsBoolean()
  en_ligne?: boolean; // Statut en ligne

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole; // Rôle applicatif
}
