import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async create(createActivityDto: CreateActivityDto) {
    const activity = new this.activityModel(createActivityDto);
    return activity.save();
  }

  async findAll() {
    return this.activityModel.find().sort({ startDate: -1 });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }

    const activity = await this.activityModel.findById(id);
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }

    const activity = await this.activityModel.findByIdAndUpdate(
      id,
      updateActivityDto,
      { new: true },
    );
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return activity;
  }

async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }
    const activity = await this.activityModel.findByIdAndDelete(id);
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return { message: 'Activité supprimée avec succès' };
  }
}
