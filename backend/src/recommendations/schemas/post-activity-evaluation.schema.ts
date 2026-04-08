import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type PostActivityEvaluationDocument = PostActivityEvaluation & Document

@Schema({ collection: 'post_activity_evaluations', timestamps: true })
export class PostActivityEvaluation {
  @Prop({ type: Types.ObjectId, ref: 'Activity', required: true, index: true })
  activityId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Recommendation', required: true, index: true })
  recommendationId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId

  @Prop({
    type: [
      {
        intitule: { type: String, required: true },
        auto_eval: { type: Number },
        hierarchie_eval: { type: Number },
      },
    ],
    default: [],
  })
  skills: Array<{ intitule: string; auto_eval?: number; hierarchie_eval?: number }>

  @Prop({ type: Date })
  employee_submitted_at?: Date

  @Prop({ type: Date })
  manager_submitted_at?: Date

  @Prop({ type: Date })
  update_applied_at?: Date
}

export const PostActivityEvaluationSchema = SchemaFactory.createForClass(PostActivityEvaluation)
PostActivityEvaluationSchema.index({ activityId: 1, userId: 1 }, { unique: true })

