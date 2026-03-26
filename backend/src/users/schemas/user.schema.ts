import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

@Schema({ timestamps: true })
export class User {
  // MongoDB génère automatiquement _id, mais on peut aussi utiliser un champ id personnalisé si nécessaire
  // Pour MongoDB, _id est déjà l'identifiant unique

  @Prop({ required: true, maxlength: 255 })
  name: string; // Nom complet de l'utilisateur

  @Prop({ required: true, unique: true, maxlength: 50 })
  matricule: string; // Numéro d'enregistrement employé

  @Prop({ required: true, maxlength: 20 })
  telephone: string; // Numéro de téléphone

  @Prop({ required: true, unique: true, lowercase: true, maxlength: 255 })
  email: string; // Adresse email

  @Prop({ required: true, maxlength: 255 })
  password: string; // Mot de passe crypté

  @Prop({ type: Date, required: true })
  date_embauche: Date; // Date d'embauche

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false })
  department_id?: Types.ObjectId; // Référence au département

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  manager_id?: Types.ObjectId; // Référence au manager (self-reference)

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE, maxlength: 50 })
  status: UserStatus; // Statut utilisateur

  @Prop({ type: String, enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole; // Rôle applicatif (HR, MANAGER, EMPLOYEE, ADMIN)

  @Prop({ type: Boolean, default: false })
  en_ligne: boolean; // Statut en ligne
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index pour améliorer les performances de recherche
UserSchema.index({ email: 1 });
UserSchema.index({ matricule: 1 });
UserSchema.index({ department_id: 1 });
UserSchema.index({ manager_id: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ en_ligne: 1 });
