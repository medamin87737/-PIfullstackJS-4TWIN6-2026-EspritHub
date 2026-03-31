import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  title: string;

  @Prop()
  titre?: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  objectifs?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  departmentId: string;

  @Prop()
  created_by?: string;

  @Prop({
    type: [
      {
        skill_name: String,
        desired_level: String,
      },
    ],
    default: [],
  })
  requiredSkills: {
    skill_name: string;
    desired_level: string;
  }[];

  @Prop({ required: true })
  maxParticipants: number;

  @Prop()
  nb_seats?: number;

  @Prop()
  location?: string; // Toujours string dans la BD

  @Prop()
  duration?: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  date?: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: 'draft' })
  status: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
