import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true, maxlength: 255 })
  name: string; // Nom du département

  @Prop({ required: true, maxlength: 50, unique: true })
  code: string; // Code unique du département

  @Prop({ maxlength: 500 })
  description?: string; // Description du département

  @Prop({ type: String, ref: 'User', required: false })
  manager_id?: string; // Référence au manager du département
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

// Index pour améliorer les performances
DepartmentSchema.index({ name: 1 });
DepartmentSchema.index({ code: 1 });
