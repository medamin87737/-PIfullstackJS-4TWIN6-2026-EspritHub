import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompetenceDocument = Competence & Document;

@Schema({ timestamps: true })
export class Competence {
  @Prop({ type: Types.ObjectId, ref: 'Fiche', required: true })
  fiches_id: Types.ObjectId; // Référence à la fiche

  @Prop({ type: Types.ObjectId, ref: 'QuestionCompetence', required: true })
  question_competence_id: Types.ObjectId; // Référence à la question de compétence

  @Prop({ required: true, maxlength: 50 })
  type: string; // Type de compétence

  @Prop({ required: true, maxlength: 255 })
  intitule: string; // Titre de la compétence

  @Prop()
  auto_eval: number; // Score d'auto-évaluation

  @Prop()
  hierarchie_eval: number; // Score d'évaluation hiérarchique

  @Prop({ required: true, maxlength: 50 })
  etat: string; // Statut de l'évaluation (draft, submitted, validated)
}

export const CompetenceSchema = SchemaFactory.createForClass(Competence);

CompetenceSchema.index({ fiches_id: 1 });
CompetenceSchema.index({ question_competence_id: 1 });
CompetenceSchema.index({ type: 1 });
CompetenceSchema.index({ etat: 1 });

