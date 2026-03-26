import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FicheDocument = Fiche & Document;

@Schema({ timestamps: true })
export class Fiche {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId; // Référence à l'utilisateur évalué

  @Prop({ required: true, maxlength: 50 })
  saisons: string; // Période / saison d'évaluation (ex: 2025, 2026)

  @Prop({ required: true, maxlength: 50 })
  etat: string; // Statut de la fiche (draft, in_progress, completed, validated)
}

export const FicheSchema = SchemaFactory.createForClass(Fiche);

FicheSchema.index({ user_id: 1 });
FicheSchema.index({ saisons: 1 });
FicheSchema.index({ etat: 1 });

