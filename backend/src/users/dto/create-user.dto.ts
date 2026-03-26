import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
  IsDateString,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est requis' })
  @MaxLength(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
  name: string; // Nom complet

  @IsString()
  @IsNotEmpty({ message: 'Le matricule est requis' })
  @MaxLength(50, { message: 'Le matricule ne peut pas dépasser 50 caractères' })
  matricule: string; // Numéro d'enregistrement employé

  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @MaxLength(20, { message: 'Le numéro de téléphone ne peut pas dépasser 20 caractères' })
  telephone: string; // Numéro de téléphone

  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  @MaxLength(255, { message: "L'email ne peut pas dépasser 255 caractères" })
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  @MaxLength(255, { message: 'Le mot de passe ne peut pas dépasser 255 caractères' })
  password: string;

  @IsDateString({}, { message: 'La date d\'embauche doit être une date valide' })
  @IsNotEmpty({ message: 'La date d\'embauche est requise' })
  date_embauche: string; // Date d'embauche (sera convertie en Date)

  @IsMongoId({ message: 'L\'ID du département doit être un ObjectId valide' })
  @IsOptional()
  department_id?: string; // Référence au département

  @IsMongoId({ message: 'L\'ID du manager doit être un ObjectId valide' })
  @IsOptional()
  manager_id?: string; // Référence au manager

  @IsEnum(UserStatus, {
    message: 'Statut invalide. Valeurs acceptées: ACTIVE, INACTIVE, SUSPENDED, TERMINATED',
  })
  @IsOptional()
  status?: UserStatus; // Statut utilisateur

  @IsEnum(UserRole, {
    message: 'Rôle invalide. Valeurs acceptées: HR, MANAGER, EMPLOYEE, ADMIN',
  })
  @IsOptional()
  role?: UserRole; // Rôle applicatif
}
