import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionCompetenceDocument = QuestionCompetence & Document;

@Schema({ timestamps: true })
export class QuestionCompetence {
  @Prop({ required: true, maxlength: 255 })
  intitule: string; // Catégorie de compétence

  @Prop()
  details: string; // Description détaillée de la question de compétence

  @Prop({ required: true, maxlength: 50 })
  status: string; // Statut de la question (active, inactive)
}

export const QuestionCompetenceSchema =
  SchemaFactory.createForClass(QuestionCompetence);

QuestionCompetenceSchema.index({ intitule: 1 });
QuestionCompetenceSchema.index({ status: 1 });

